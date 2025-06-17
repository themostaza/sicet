'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { handlePostgrestError as handleError } from "@/lib/supabase/error"
import { generateUUID } from "@/lib/utils"
import type { TablesInsert } from "@/supabase/database.types"
import { 
  TIME_SLOT_TOLERANCE, 
  TIME_SLOT_INTERVALS, 
  isCustomTimeSlot,
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
  
  if (timeSlotType === "custom" && timeSlotStart !== null && timeSlotEnd !== null) {
    // For custom time slots, deadline is end time + tolerance
    const deadline = new Date(scheduledDate)
    deadline.setHours(timeSlotEnd + TIME_SLOT_TOLERANCE, 0, 0, 0)
    
    // If the deadline goes past midnight, add a day
    if (deadline.getHours() < timeSlotEnd) {
      deadline.setDate(deadline.getDate() + 1)
    }
    
    return deadline
  } else {
    // For standard time slots, use the predefined intervals
    const hour = scheduledDate.getHours()
    let endHour = 23 // Default to end of day
    
    // Find the appropriate time slot interval
    for (const [slotName, interval] of Object.entries(TIME_SLOT_INTERVALS)) {
      if (hour >= interval.start && hour <= interval.end) {
        endHour = interval.end + TIME_SLOT_TOLERANCE
        break
      }
    }
    
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
  return now > deadline
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
  const supabase = await getSupabaseClient()
  
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
        kpi:kpis (
          name,
          description
        )
      )
    `)
    .eq("status", "pending")
    .not("todolist_alert", "is", null)

  if (error) handleError(error)

  if (!data) return []

  // Filter for overdue todolists with incomplete tasks
  return data
    .filter(todolist => 
      todolist.alert && 
      isTodolistOverdue(todolist) && 
      !areAllTasksCompleted(todolist.tasks)
    )
    .map(todolist => ({
      ...todolist,
      alert: todolist.alert[0] // Take the first alert since it's a one-to-one relationship
    })) as OverdueTodolist[]
}

// Send overdue notification for a todolist
export async function sendTodolistOverdueNotification(todolist: OverdueTodolist): Promise<void> {
  const supabase = await getSupabaseClient()
  
  if (!todolist.alert) {
    throw new Error("No alert configured for this todolist")
  }
  
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

    // Log the successful notification
    const logData: TablesInsert<"todolist_alert_logs"> = {
      id: generateUUID(),
      todolist_id: todolist.id,
      alert_id: todolist.alert.id,
      email: todolist.alert.email,
      sent_at: new Date().toISOString(),
      error_message: null
    }

    const { error: logError } = await supabase
      .from("todolist_alert_logs")
      .insert(logData)

    if (logError) {
      console.error("Error logging todolist alert:", logError)
    }

  } catch (error) {
    console.error("Error sending todolist overdue notification:", error)
    
    // Log the failed notification
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
      console.error("Error logging todolist alert error:", logError)
    }

    throw error
  }
}

// Process all overdue todolists and send notifications
export async function processOverdueTodolists(): Promise<{
  processed: number
  errors: number
}> {
  try {
    const overdueTodolists = await getOverdueTodolists()
    let processed = 0
    let errors = 0

    for (const todolist of overdueTodolists) {
      try {
        await sendTodolistOverdueNotification(todolist)
        processed++
      } catch (error) {
        console.error(`Error processing overdue todolist ${todolist.id}:`, error)
        errors++
      }
    }

    return { processed, errors }
  } catch (error) {
    console.error("Error processing overdue todolists:", error)
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