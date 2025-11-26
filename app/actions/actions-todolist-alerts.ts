'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { handlePostgrestError as handleError } from "@/lib/supabase/error"
import type { TablesInsert } from "@/supabase/database.types"
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
  
  const now = new Date().toISOString()
  
  console.log('⏰ [OVERDUE] Searching for overdue todolists:', {
    now: now,
    criteria: 'end_day_time < NOW() AND completion_date IS NULL AND status = pending'
  })
  
  // Simplified query: if end_day_time is past and completion_date is null, it's overdue
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
      completion_date,
      device:devices (
        name,
        location
      ),
      alert:todolist_alert!inner (
        id,
        email,
        is_active
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
    .is("completion_date", null)
    .lt("end_day_time", now)
    .eq("alert.is_active", true)

  if (error) handleError(error)

  if (!data) {
    console.log('⚠️ [OVERDUE] No data returned from database')
    return []
  }

  console.log(`📊 [OVERDUE] Found ${data.length} overdue todolists with alerts configured`)

  // Filter for todolists that have alerts and incomplete tasks
  const finalResults = data
    .filter(todolist => {
      const hasAlert = todolist.alert && todolist.alert.length > 0
      const allTasksCompleted = areAllTasksCompleted(todolist.tasks)
      
      if (hasAlert && !allTasksCompleted) {
        console.log(`📝 [OVERDUE] Todolist ${todolist.id}:`, {
          device: todolist.device?.name || 'Unknown',
          scheduledExecution: todolist.scheduled_execution,
          endDayTime: todolist.end_day_time,
          totalTasks: todolist.tasks.length,
          completedTasks: todolist.tasks.filter(t => t.status === 'completed').length,
          alertEmail: todolist.alert?.[0]?.email || 'No email'
        })
        return true
      }
      return false
    })
    .map(todolist => ({
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

    // Disable the alert after successfully sending the email
    console.log(`🔒 [EMAIL] Disabling alert to prevent duplicates...`)
    try {
      // Set is_active to false instead of deleting
      // This will prevent the alert from being triggered again while keeping the record
      const { error: updateError } = await supabase
        .from("todolist_alert")
        .update({ is_active: false })
        .eq("id", todolist.alert.id)

      if (updateError) {
        console.error("❌ [EMAIL] Error disabling todolist alert:", updateError)
      } else {
        console.log(`✅ [EMAIL] Alert disabled successfully for todolist ${todolist.id}`)
      }
    } catch (disableError) {
      console.error("❌ [EMAIL] Error in alert disable logic:", disableError)
    }

  } catch (error) {
    console.error("💥 [EMAIL] Error sending todolist overdue notification:", error)
    console.error("💥 [EMAIL] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    
    // Log the failed notification
    console.log(`📊 [EMAIL] Logging error notification to database...`)
    const logData: TablesInsert<"todolist_alert_logs"> = {
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