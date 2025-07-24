'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { handlePostgrestError as handleError } from "@/lib/supabase/error"
import { generateUUID } from "@/lib/utils"
import type { TablesInsert } from "@/supabase/database.types"
import { 
  TIME_SLOT_TOLERANCE, 
  TIME_SLOT_INTERVALS, 
  isCustomTimeSlot,
  minutesToTime,
  type TimeSlotValue 
} from "@/lib/validation/todolist-schemas"
import { sendTodolistOverdueEmail } from "@/app/lib/email"

/** -------------------------------------------------------------------------
 * 1 · TYPES
 * ------------------------------------------------------------------------*/

interface OverdueTodolist {
  id: string
  device_id: string
  scheduled_execution: string
  time_slot_type: "standard" | "custom"
  time_slot_start: number | null
  time_slot_end: number | null
  device: {
    name: string
    location: string | null
  }
  alert: {
    id: string
    email: string
    // TODO: Add is_active: boolean after database migration
  } | null
  tasks: Array<{
    id: string
    kpi_id: string
    status: string
    kpi: {
      name: string
      description: string | null
    }
  }>
}

/** -------------------------------------------------------------------------
 * 2 · HELPERS
 * ------------------------------------------------------------------------*/

// Helper function to get Supabase client
async function getSupabaseClient() {
  return await createServerSupabaseClient()
}

// Calculate the deadline for a todolist based on its time slot
function calculateTodolistDeadline(
  scheduledExecution: string, 
  timeSlotType: "standard" | "custom",
  timeSlotStart: number | null,
  timeSlotEnd: number | null
): Date {
  const scheduledDate = new Date(scheduledExecution)
  
  if (timeSlotStart !== null && timeSlotEnd !== null) {
    // Use explicit end time from database
    const endTime = minutesToTime(timeSlotEnd)
    const deadline = new Date(scheduledDate)
    
    // Add tolerance hours but keep the exact minutes
    const deadlineHour = endTime.hour + TIME_SLOT_TOLERANCE
    deadline.setHours(deadlineHour, endTime.minute, 0, 0)
    
    // If the deadline goes past midnight, add a day
    if (deadlineHour >= 24) {
      deadline.setDate(deadline.getDate() + 1)
      deadline.setHours(deadlineHour - 24, endTime.minute, 0, 0)
    }
    
    return deadline
  } else {
    // Fallback for old data - reconstruct from scheduled_execution
    const hour = scheduledDate.getHours()
    let endHour = 23 // Default to end of day
    let foundSlot = "unknown"
    
    // Find the appropriate time slot interval
    for (const [slotName, interval] of Object.entries(TIME_SLOT_INTERVALS)) {
      if (hour >= interval.start && hour <= interval.end) {
        endHour = interval.end + TIME_SLOT_TOLERANCE
        foundSlot = slotName
        break
      }
    }
    
    console.log(`🔄 [DEADLINE] Fallback mode for ${scheduledExecution}: found slot "${foundSlot}", end hour: ${endHour}`)
    
    const deadline = new Date(scheduledDate)
    deadline.setHours(endHour, 0, 0, 0)
    
    // If the deadline goes past midnight, add a day
    if (deadline.getHours() < endHour) {
      deadline.setDate(deadline.getDate() + 1)
    }
    
    return deadline
  }
}

// Check if a todolist is overdue
function isTodolistOverdue(todolist: {
  scheduled_execution: string
  time_slot_type: "standard" | "custom"
  time_slot_start: number | null
  time_slot_end: number | null
}): boolean {
  const deadline = calculateTodolistDeadline(
    todolist.scheduled_execution,
    todolist.time_slot_type,
    todolist.time_slot_start,
    todolist.time_slot_end
  )
  
  const now = new Date()
  const isOverdue = now > deadline
  
  // Only log if actually overdue to reduce noise
  if (isOverdue) {
    console.log(`⚖️ [OVERDUE-CHECK] Found overdue todolist:`, {
      scheduledExecution: todolist.scheduled_execution,
      now: now.toISOString(),
      deadline: deadline.toISOString(),
      hoursOverdue: Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60))
    })
  }
  
  return isOverdue
}

// Check if all tasks in a todolist are completed
function areAllTasksCompleted(tasks: OverdueTodolist['tasks']): boolean {
  return tasks.every(task => task.status === 'completed')
}

/** -------------------------------------------------------------------------
 * 3 · SERVER ACTIONS
 * ------------------------------------------------------------------------*/

// Get overdue todolists that have alerts configured
export async function getOverdueTodolists(): Promise<OverdueTodolist[]> {
  console.log('🔍 [OVERDUE] Starting getOverdueTodolists analysis...')
  const supabase = await getSupabaseClient()
  
  // Calculate the time window: end_day_time between (NOW - 6h) and (NOW - 3h)
  const currentTime = new Date()
  const windowEnd = new Date(currentTime.getTime() - (TIME_SLOT_TOLERANCE * 60 * 60 * 1000)) // NOW - 3h
  const windowStart = new Date(currentTime.getTime() - (6 * 60 * 60 * 1000)) // NOW - 6h
  
  console.log('⏰ [OVERDUE] Time window for filtering:', {
    now: currentTime.toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    toleranceHours: TIME_SLOT_TOLERANCE
  })
  
  const { data, error } = await supabase
    .from("todolist")
    .select(`
      id,
      device_id,
      scheduled_execution,
      time_slot_type,
      time_slot_start,
      time_slot_end,
      status,
      end_day_time,
      device:devices (
        name,
        location
      ),
      alert:todolist_alert (
        id,
        email
      ),
      tasks (
        id,
        kpi_id,
        status,
        kpi:kpis!tasks_kpi_id_fkey (
          name,
          description
        )
      )
    `)
    .eq("status", "pending")
    .gte("end_day_time", windowStart.toISOString())
    .lte("end_day_time", windowEnd.toISOString())

  if (error) handleError(error)

  if (!data) {
    console.log('⚠️ [OVERDUE] No data returned from database')
    return []
  }

  console.log(`📊 [OVERDUE] Found ${data.length} pending todolists in time window (pre-filtered by DB)`)

  // Log details about filtering process
  const withAlerts = data.filter(t => t.alert && t.alert.length > 0)
  console.log(`📧 [OVERDUE] ${withAlerts.length} have alerts configured`)

  const withValidTimeSlot = withAlerts.filter(t => 
    t.time_slot_type === "standard" || t.time_slot_type === "custom"
  )
  console.log(`⏰ [OVERDUE] ${withValidTimeSlot.length} have valid time slot type`)

  // Since we already filtered by end_day_time in DB, all these should be potentially overdue
  console.log(`🔍 [OVERDUE] Processing ${withValidTimeSlot.length} todolists (already filtered by DB time window)`)
  
  const overdueResults = withValidTimeSlot.map(todolist => {
    const isOverdue = isTodolistOverdue({
      ...todolist,
      time_slot_type: todolist.time_slot_type as "standard" | "custom"
    })
    
    const allTasksCompleted = areAllTasksCompleted(todolist.tasks)
    const shouldProcess = isOverdue && !allTasksCompleted
    
    // Only log details for todolists that actually matter
    if (shouldProcess || isOverdue) {
      console.log(`📝 [OVERDUE] Todolist ${todolist.id}:`, {
        device: todolist.device?.name || 'Unknown',
        scheduledExecution: todolist.scheduled_execution,
        timeSlotType: todolist.time_slot_type,
        timeSlotStart: todolist.time_slot_start,
        timeSlotEnd: todolist.time_slot_end,
        isOverdue: isOverdue,
        totalTasks: todolist.tasks.length,
        completedTasks: todolist.tasks.filter(t => t.status === 'completed').length,
        allTasksCompleted: allTasksCompleted,
        shouldProcess: shouldProcess,
        alertEmail: todolist.alert?.[0]?.email || 'No email'
      })
    }
    
    return { todolist, shouldProcess }
  })

  // Filter for overdue todolists with alerts and incomplete tasks
  const finalResults = overdueResults
    .filter(({ shouldProcess }) => shouldProcess)
    .map(({ todolist }) => ({
      ...todolist,
      time_slot_type: todolist.time_slot_type as "standard" | "custom",
      alert: todolist.alert[0] // Take the first alert since it's a one-to-one relationship
    })) as OverdueTodolist[]

  console.log(`🎯 [OVERDUE] Final result: ${finalResults.length} todolists need processing`)
  
  return finalResults
}

// Send overdue notification for a todolist
export async function sendTodolistOverdueNotification(todolist: OverdueTodolist): Promise<void> {
  console.log(`📧 [EMAIL] Starting notification for todolist ${todolist.id}`)
  
  const supabase = await getSupabaseClient()
  
  if (!todolist.alert) {
    console.log(`❌ [EMAIL] No alert configured for todolist ${todolist.id}`)
    throw new Error("No alert configured for this todolist")
  }
  
  console.log(`📤 [EMAIL] Sending email to: ${todolist.alert.email}`, {
    todolistId: todolist.id,
    deviceName: todolist.device.name,
    deviceLocation: todolist.device.location,
    scheduledExecution: todolist.scheduled_execution,
    tasksCount: todolist.tasks.length
  })
  
  try {
    // Send the email
    await sendTodolistOverdueEmail({
      todolistId: todolist.id,
      deviceName: todolist.device.name,
      deviceLocation: todolist.device.location,
      scheduledExecution: todolist.scheduled_execution,
      email: todolist.alert.email,
      tasks: todolist.tasks
    })

    console.log(`✅ [EMAIL] Email sent successfully for todolist ${todolist.id}`)

    // Log the successful notification
    const logData: TablesInsert<"todolist_alert_logs"> = {
      id: generateUUID(),
      todolist_id: todolist.id,
      alert_id: todolist.alert.id,
      email: todolist.alert.email,
      sent_at: new Date().toISOString(),
      error_message: null
    }

    console.log(`📊 [EMAIL] Logging successful notification to database...`)
    const { error: logError } = await supabase
      .from("todolist_alert_logs")
      .insert(logData)

    if (logError) {
      console.error("❌ [EMAIL] Error logging todolist alert:", logError)
    } else {
      console.log(`✅ [EMAIL] Successfully logged notification to database`)
    }

    // Try to disable the alert after successfully sending the email
    console.log(`🗑️ [EMAIL] Deleting alert to prevent duplicates...`)
    try {
      // For now, delete the alert after sending the email
      // This will prevent the alert from being triggered again
      const { error: deleteError } = await supabase
        .from("todolist_alert")
        .delete()
        .eq("id", todolist.alert.id)

      if (deleteError) {
        console.error("❌ [EMAIL] Error deleting todolist alert:", deleteError)
      } else {
        console.log(`✅ [EMAIL] Alert deleted successfully for todolist ${todolist.id}`)
      }
    } catch (disableError) {
      console.error("❌ [EMAIL] Error in alert delete logic:", disableError)
    }

  } catch (error) {
    console.error("💥 [EMAIL] Error sending todolist overdue notification:", error)
    console.error("💥 [EMAIL] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    
    // Log the failed notification
    console.log(`📊 [EMAIL] Logging error notification to database...`)
    const logData: TablesInsert<"todolist_alert_logs"> = {
      id: generateUUID(),
      todolist_id: todolist.id,
      alert_id: todolist.alert.id,
      email: todolist.alert.email,
      sent_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : "Unknown error"
    }

    const { error: logError } = await supabase
      .from("todolist_alert_logs")
      .insert(logData)

    if (logError) {
      console.error("❌ [EMAIL] Error logging todolist alert error:", logError)
    } else {
      console.log(`✅ [EMAIL] Error logged to database successfully`)
    }

    throw error
  }
}

// Process all overdue todolists and send notifications
export async function processOverdueTodolists(): Promise<{
  processed: number
  errors: number
  details: Array<{
    todolistId: string
    deviceName: string
    email: string
    status: "sent" | "error"
    errorMessage?: string
  }>
}> {
  console.log('🚀 [PROCESS] Starting processOverdueTodolists...')
  
  try {
    const overdueTodolists = await getOverdueTodolists()
    console.log(`📋 [PROCESS] Retrieved ${overdueTodolists.length} overdue todolists to process`)
    
    let processed = 0
    let errors = 0
    const details: Array<{
      todolistId: string
      deviceName: string
      email: string
      status: "sent" | "error"
      errorMessage?: string
    }> = []

    if (overdueTodolists.length === 0) {
      console.log('✨ [PROCESS] No overdue todolists found - nothing to process')
      return { processed: 0, errors: 0, details: [] }
    }

    console.log('📤 [PROCESS] Starting to send notifications...')
    for (const [index, todolist] of overdueTodolists.entries()) {
      console.log(`📧 [PROCESS] Processing ${index + 1}/${overdueTodolists.length}: Todolist ${todolist.id}`, {
        device: todolist.device.name,
        email: todolist.alert?.email,
        scheduledExecution: todolist.scheduled_execution,
        tasksCount: todolist.tasks.length
      })
      
      try {
        await sendTodolistOverdueNotification(todolist)
        processed++
        console.log(`✅ [PROCESS] Successfully sent notification for todolist ${todolist.id}`)
        details.push({
          todolistId: todolist.id,
          deviceName: todolist.device.name,
          email: todolist.alert?.email || "N/A",
          status: "sent"
        })
      } catch (error) {
        console.error(`❌ [PROCESS] Error processing overdue todolist ${todolist.id}:`, error)
        console.error(`❌ [PROCESS] Error details for ${todolist.id}:`, {
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : 'No stack trace'
        })
        errors++
        details.push({
          todolistId: todolist.id,
          deviceName: todolist.device.name,
          email: todolist.alert?.email || "N/A",
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    console.log('🎯 [PROCESS] Processing completed:', {
      totalProcessed: processed,
      totalErrors: errors,
      totalTodolists: overdueTodolists.length,
      successRate: `${Math.round((processed / overdueTodolists.length) * 100)}%`
    })

    return { processed, errors, details }
  } catch (error) {
    console.error("💥 [PROCESS] Critical error in processOverdueTodolists:", error)
    console.error("💥 [PROCESS] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

// Get todolist alert logs
export async function getTodolistAlertLogs(todolistId: string): Promise<{
  id: string
  sent_at: string
  error_message: string | null
}[]> {
  const supabase = await getSupabaseClient()
  
  const { data, error } = await supabase
    .from("todolist_alert_logs")
    .select("id, sent_at, error_message")
    .eq("todolist_id", todolistId)
    .order("sent_at", { ascending: false })

  if (error) handleError(error)

  return data || []
} 