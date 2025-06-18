'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { handlePostgrestError as handleError } from "@/lib/supabase/error"
import { logCurrentUserActivity } from "./actions-activity"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { generateUUID } from "@/lib/utils"
import type { TablesInsert } from "@/supabase/database.types"
import type { Database } from "@/supabase/database.types"
import type { PostgrestError } from "@supabase/supabase-js"
import {
  TodolistSchema,
  TaskSchema,
  TodolistParamsSchema,
  CreateTodolistSchema,
  TodolistIdParamsSchema,
  type Todolist,
  type Task,
  type TodolistParams,
  type TodolistIdParams,
  type CreateTodolistParams,
  type TimeSlot,
  timeSlotOrder,
  getTimeRangeFromSlot,
  getTimeSlotFromDateTime,
  isTodolistExpired,
  toTask,
  toTodolist,
  isCustomTimeSlot,
  isCustomTimeSlotString,
  parseCustomTimeSlotString,
  timeToMinutes,
  type CustomTimeSlot,
  type TimeSlotValue,
  minutesToTime
} from "@/lib/validation/todolist-schemas"
import { checkKpiAlerts } from "./actions-alerts"

/** -------------------------------------------------------------------------
 * 1 · TYPES
 * ------------------------------------------------------------------------*/

type TasksRow = {
  id: string
  todolist_id: string
  kpi_id: string
  status: string
  value: any
  created_at: string | null
  alert_checked: boolean
  updated_at: string | null
}

type TodolistRow = {
  id: string
  device_id: string
  scheduled_execution: string
  status: "pending" | "in_progress" | "completed"
  created_at: string | null
  updated_at: string | null
  time_slot_type: "standard" | "custom"
  time_slot_start: number | null
  time_slot_end: number | null
}

type TodolistWithTasks = TodolistRow & {
  tasks: Array<{
    id: string
    kpi_id: string
    status: string
  }>
}

/** -------------------------------------------------------------------------
 * 2 · HELPERS
 * ------------------------------------------------------------------------*/

// Helper function to get Supabase client
async function getSupabaseClient() {
  return await createServerSupabaseClient()
}

/** -------------------------------------------------------------------------
 * 3 · ERROR HANDLING
 * ------------------------------------------------------------------------*/

class TodolistActionError extends Error {
  public readonly code: string;
  public readonly errors?: z.ZodIssue[];
  constructor(message: string, code: string, errors?: z.ZodIssue[]) {
    super(message);
    this.name = "TodolistActionError";
    this.code = code;
    this.errors = errors;
  }
}

function handleZodError(e: z.ZodError): never {
  const errorsMessage = e.errors.map(err => {
    const path = err.path.join(".");
    return `${path}: ${err.message}`;
  }).join(", ");
  
  throw new TodolistActionError(
    `Errore di validazione: ${errorsMessage}`,
    "VALIDATION_ERROR",
    e.errors
  );
}

/** -------------------------------------------------------------------------
 * 4 · SERVER ACTIONS
 * ------------------------------------------------------------------------*/

// Ottieni una todolist
export async function getTodolist(params: unknown): Promise<Todolist | null> {
  const { deviceId, date, timeSlot } = TodolistParamsSchema.parse(params)
  const { startTime } = getTimeRangeFromSlot(date, timeSlot)

  const { data, error } = await (await getSupabaseClient())
    .from("todolist")
    .select("*")
    .eq("device_id", deviceId)
    .eq("scheduled_execution", startTime)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // Not found
    handleError(error)
  }

  return data ? toTodolist(data) : null
}

// Ottieni le task per una todolist (con paginazione)
export async function getTodolistTasks(params: unknown): Promise<{ tasks: Task[]; hasMore: boolean }> {
  const { deviceId, date, timeSlot, offset, limit } = TodolistParamsSchema.parse(params)
  const { startTime: rangeStartTime } = getTimeRangeFromSlot(date, timeSlot)

  // First get the todolist
  const todolist = await getTodolist({ deviceId, date, timeSlot })
  if (!todolist) {
    return { tasks: [], hasMore: false }
  }

  const { data, count, error } = await (await getSupabaseClient())
    .from("tasks")
    .select("*", { count: "exact" })
    .eq("todolist_id", todolist.id)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) handleError(error)
  const tasks = (data ?? []).map(toTask)
  const hasMore = count !== null ? offset + limit < count : tasks.length === limit
  return { tasks, hasMore }
}

// Ottieni le task per una todolist usando l'ID (con paginazione)
export async function getTodolistTasksById(params: unknown): Promise<{ tasks: Task[]; hasMore: boolean }> {
  const { todolistId, offset, limit } = TodolistIdParamsSchema.parse(params)

  const { data, count, error } = await (await getSupabaseClient())
    .from("tasks")
    .select("*", { count: "exact" })
    .eq("todolist_id", todolistId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) handleError(error)
  const tasks = (data ?? []).map(toTask)
  const hasMore = count !== null ? offset + limit < count : tasks.length === limit
  return { tasks, hasMore }
}

// Aggiorna stato task
export async function updateTaskStatus(taskId: string, status: string): Promise<Task> {
  console.log(`[updateTaskStatus] Starting update for task ${taskId} with status ${status}`)
  
  // First get the task to get its todolist_id
  const { data: taskData, error: taskError } = await (await getSupabaseClient())
    .from("tasks")
    .select("todolist_id, kpi_id, value, alert_checked")
    .eq("id", taskId)
    .single()

  if (taskError) {
    console.error(`[updateTaskStatus] Error fetching task:`, taskError)
    handleError(taskError)
  }
  if (!taskData) {
    console.error(`[updateTaskStatus] Task not found: ${taskId}`)
    throw new Error("Task not found")
  }

  console.log(`[updateTaskStatus] Task data:`, {
    taskId,
    todolistId: taskData.todolist_id,
    kpiId: taskData.kpi_id,
    hasValue: !!taskData.value,
    alertChecked: taskData.alert_checked,
    status
  })

  // Update the task status
  const { data, error } = await (await getSupabaseClient())
    .from("tasks")
    .update({ 
      status, 
      alert_checked: status === "completed" ? true : taskData.alert_checked
    })
    .eq("id", taskId)
    .select()
    .single()

  if (error) {
    console.error(`[updateTaskStatus] Error updating task:`, error)
    handleError(error)
  }

  return toTask(data!)
}

// Aggiorna valore task
export async function updateTaskValue(taskId: string, value: any): Promise<Task> {
  // Aggiorna il valore della task
  const { data, error } = await (await getSupabaseClient())
    .from("tasks")
    .update({ value })
    .eq("id", taskId)
    .select()
    .single()

  if (error) handleError(error)
  const updatedTask = toTask(data!)

  // Trigger alert
  await checkKpiAlerts(updatedTask.kpi_id, updatedTask.todolist_id, value)

  return updatedTask
}

// Elimina una todolist e tutte le sue task
export async function deleteTodolist(deviceId: string, date: string, timeSlot: string): Promise<void> {
  const { startTime } = getTimeRangeFromSlot(date, timeSlot)
  
  // Get todolist info before deleting for logging
  const { data: todolistData, error: todolistError } = await (await getSupabaseClient())
    .from("todolist")
    .select("id")
    .eq("device_id", deviceId)
    .eq("scheduled_execution", startTime)
    .single()

  if (todolistError) {
    if (todolistError.code === "PGRST116") return // Not found
    handleError(todolistError)
  }

  if (!todolistData) return

  // Get tasks info before deleting for logging
  const { data: tasksData } = await (await getSupabaseClient())
    .from("tasks")
    .select("id, kpi_id")
    .eq("todolist_id", todolistData.id)
  
  // Delete the todolist (this will cascade delete all tasks)
  const { error } = await (await getSupabaseClient())
    .from("todolist")
    .delete()
    .eq("id", todolistData.id)
  
  if (error) handleError(error)
  
  // Log activities for each deleted task
  if (tasksData) {
    await Promise.all(tasksData.map(task => 
      logCurrentUserActivity('delete_todolist', 'task', task.id, {
        device_id: deviceId,
        kpi_id: task.kpi_id,
        scheduled_execution: startTime,
        time_slot: timeSlot
      })
    ));
  }
  
  revalidatePath("/todolist")
}

// Elimina una todolist direttamente per ID (più affidabile)
export async function deleteTodolistById(todolistId: string): Promise<void> {
  // Get todolist info before deleting for logging
  const { data: todolistData, error: todolistError } = await (await getSupabaseClient())
    .from("todolist")
    .select("device_id, scheduled_execution")
    .eq("id", todolistId)
    .single()

  if (todolistError) {
    if (todolistError.code === "PGRST116") return // Not found
    handleError(todolistError)
  }

  if (!todolistData) return

  // Get tasks info before deleting for logging
  const { data: tasksData } = await (await getSupabaseClient())
    .from("tasks")
    .select("id, kpi_id")
    .eq("todolist_id", todolistId)
  
  // Delete the todolist (this will cascade delete all tasks)
  const { error } = await (await getSupabaseClient())
    .from("todolist")
    .delete()
    .eq("id", todolistId)
  
  if (error) handleError(error)
  
  // Log activities for each deleted task
  if (tasksData) {
    await Promise.all(tasksData.map(task => 
      logCurrentUserActivity('delete_todolist', 'task', task.id, {
        todolist_id: todolistId,
        device_id: todolistData.device_id,
        kpi_id: task.kpi_id,
        scheduled_execution: todolistData.scheduled_execution
      })
    ));
  }
  
  revalidatePath("/todolist")
}

// Ottieni tutte le todolist individualmente (senza raggruppamento)
export async function getTodolistsGrouped() {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from("todolist")
      .select(`
        id,
        device_id,
        scheduled_execution,
        status,
        created_at,
        time_slot_type,
        time_slot_start,
        time_slot_end,
        devices (
          name
        ),
        tasks (
          id,
          kpi_id,
          status
        )
      `)
      .order("scheduled_execution", { ascending: false })

    if (error) {
      console.error("Error fetching todolists:", error)
      throw new TodolistActionError(
        "Errore nel recupero delle todolist",
        "FETCH_ERROR"
      )
    }

    if (!data) {
      return []
    }

    // Process each todolist individually without grouping
    const processedTodolists = data.map((item) => {
      try {
        const date = new Date(item.scheduled_execution).toISOString().split("T")[0]
        let timeSlotValue: TimeSlotValue
        
        // Determina il tipo di time slot
        if (item.time_slot_type === "custom" && item.time_slot_start !== null && item.time_slot_end !== null) {
          // Time slot personalizzato - converti da minuti a ore e minuti
          const startTime = minutesToTime(item.time_slot_start)
          const endTime = minutesToTime(item.time_slot_end)
          const customSlot: CustomTimeSlot = {
            type: "custom",
            startHour: startTime.hour,
            startMinute: startTime.minute,
            endHour: endTime.hour,
            endMinute: endTime.minute
          }
          timeSlotValue = customSlot
        } else {
          // Time slot standard
          const standardSlot = getTimeSlotFromDateTime(item.scheduled_execution)
          timeSlotValue = standardSlot
        }
        
        return {
          id: item.id,
          device_id: item.device_id,
          device_name: item.devices?.name || "Unknown Device",
          date,
          time_slot: timeSlotValue,
          scheduled_execution: item.scheduled_execution,
          status: item.status as "pending" | "in_progress" | "completed",
          count: item.tasks ? item.tasks.length : 0,
          time_slot_type: item.time_slot_type,
          time_slot_start: item.time_slot_start,
          time_slot_end: item.time_slot_end,
          created_at: item.created_at,
          tasks: item.tasks || []
        }
      } catch (err) {
        console.error("Error processing todolist item:", err, item)
        return null
      }
    }).filter(Boolean) as Array<{
      id: string
      device_id: string
      device_name: string
      date: string
      time_slot: TimeSlotValue
      scheduled_execution: string
      status: "pending" | "in_progress" | "completed"
      count: number
      time_slot_type: "standard" | "custom"
      time_slot_start: number | null
      time_slot_end: number | null
      created_at: string | null
      tasks: Array<{ id: string; kpi_id: string; status: string }>
    }>

    return processedTodolists
  } catch (err) {
    console.error("Unexpected error in getTodolistsGrouped:", err)
    throw new TodolistActionError(
      "Errore inatteso nel recupero delle todolist",
      "UNEXPECTED_ERROR"
    )
  }
}

function getCurrentTimeSlot(dateObj: Date): TimeSlot {
  const hours = dateObj.getHours();
  if (hours >= 6 && hours < 14) return "mattina";
  if (hours >= 14 && hours < 22) return "pomeriggio";
  return "notte";
}

// Helper function to get time slot with delay
function getTimeSlotWithDelay(dateObj: Date, delayHours: number = 3): TimeSlot {
  const delayedDate = new Date(dateObj);
  delayedDate.setHours(delayedDate.getHours() - delayHours);
  return getCurrentTimeSlot(delayedDate);
}

export async function getTodolistsGroupedWithFilters() {
  try {
    const todolists = await getTodolistsGrouped();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const filtered = {
      all: todolists,
      today: todolists.filter(
        (item) =>
          item.date === today &&
          item.status !== "completed" &&
          !isTodolistExpired(item.scheduled_execution, item.time_slot_type, item.time_slot_end)
      ),
      overdue: todolists.filter(
        (item) =>
          item.status !== "completed" &&
          isTodolistExpired(item.scheduled_execution, item.time_slot_type, item.time_slot_end)
      ),
      future: todolists.filter(
        (item) =>
          item.status !== "completed" &&
          new Date(item.date) > new Date(today) &&
          !isTodolistExpired(item.scheduled_execution, item.time_slot_type, item.time_slot_end)
      ),
      completed: todolists.filter((item) => item.status === "completed"),
    };

    const counts = {
      all: filtered.all.length,
      today: filtered.today.length,
      overdue: filtered.overdue.length,
      future: filtered.future.length,
      completed: filtered.completed.length,
    };

    return { filtered, counts };
  } catch (error) {
    if (error instanceof TodolistActionError) {
      throw error;
    }
    console.error("Unexpected error in getTodolistsGroupedWithFilters:", error);
    throw new TodolistActionError(
      "Errore inatteso nel filtraggio delle todolist",
      "UNEXPECTED_ERROR"
    );
  }
}

// Crea una todolist e le sue task
export async function createTodolist(
  deviceId: string, 
  date: string, 
  timeSlot: string, 
  kpiId: string,
  alertEnabled?: boolean,
  email?: string
): Promise<Task> {
  const { startTime } = getTimeRangeFromSlot(date, timeSlot)
  
  // Determine if this is a custom time slot
  const isCustom = isCustomTimeSlotString(timeSlot)
  let customTimeSlot: CustomTimeSlot | null = null
  
  if (isCustom) {
    customTimeSlot = parseCustomTimeSlotString(timeSlot)
  }
  
  // First create the todolist
  const todolistData: TablesInsert<"todolist"> = {
    id: generateUUID(),
    device_id: deviceId,
    scheduled_execution: startTime,
    status: "pending",
    time_slot_type: isCustom ? "custom" : "standard",
    ...(isCustom && customTimeSlot && {
      time_slot_start: timeToMinutes(customTimeSlot.startHour, customTimeSlot.startMinute || 0),
      time_slot_end: timeToMinutes(customTimeSlot.endHour, customTimeSlot.endMinute || 0)
    })
  }
  
  const { data: todolist, error: todolistError } = await (await getSupabaseClient())
    .from("todolist")
    .insert(todolistData)
    .select()
    .single()
  
  if (todolistError) handleError(todolistError)

  // If alert is enabled and email is provided, create the alert
  if (alertEnabled && email) {
    // Check if an alert already exists for this todolist
    const { data: existingAlert, error: checkError } = await (await getSupabaseClient())
      .from("todolist_alert")
      .select("id")
      .eq("todolist_id", todolist!.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking existing alert:", checkError)
    }

    // Only create alert if one doesn't already exist
    if (!existingAlert) {
      const alertData: TablesInsert<"todolist_alert"> = {
        todolist_id: todolist!.id,
        email
      }

      const { error: alertError } = await (await getSupabaseClient())
        .from("todolist_alert")
        .insert(alertData)

      if (alertError) handleError(alertError)
    } else {
      console.log(`Alert already exists for todolist ${todolist!.id}, skipping creation`)
    }
  }
  
  // Then create the task
  const taskData: TablesInsert<"tasks"> = {
    id: generateUUID(),
    todolist_id: todolist!.id,
    kpi_id: kpiId,
    status: "pending",
    value: null
  }
  
  const { data: task, error: taskError } = await (await getSupabaseClient())
    .from("tasks")
    .insert(taskData)
    .select()
    .single()
  
  if (taskError) handleError(taskError)
  
  // Log the activity
  await logCurrentUserActivity('create_todolist', 'task', task!.id, {
    device_id: deviceId,
    kpi_id: kpiId,
    scheduled_execution: startTime,
    time_slot: timeSlot,
    alert_enabled: alertEnabled,
    alert_email: email
  });
  
  revalidatePath("/todolist")
  return toTask(task!)
}

// Utility per creare multiple task in una todolist
export async function createMultipleTasks(
  deviceId: string, 
  date: string, 
  timeSlot: string, 
  kpiIds: string[],
  alertEnabled?: boolean,
  email?: string
): Promise<{ id: string }> {
  const { startTime } = getTimeRangeFromSlot(date, timeSlot)
  
  // Determine if this is a custom time slot
  const isCustom = isCustomTimeSlotString(timeSlot)
  let customTimeSlot: CustomTimeSlot | null = null
  
  if (isCustom) {
    customTimeSlot = parseCustomTimeSlotString(timeSlot)
  }
  
  // First create the todolist
  const todolistData: TablesInsert<"todolist"> = {
    id: generateUUID(),
    device_id: deviceId,
    scheduled_execution: startTime,
    status: "pending",
    time_slot_type: isCustom ? "custom" : "standard",
    ...(isCustom && customTimeSlot && {
      time_slot_start: timeToMinutes(customTimeSlot.startHour, customTimeSlot.startMinute || 0),
      time_slot_end: timeToMinutes(customTimeSlot.endHour, customTimeSlot.endMinute || 0)
    })
  }
  
  const { data: todolist, error: todolistError } = await (await getSupabaseClient())
    .from("todolist")
    .insert(todolistData)
    .select()
    .single()
  
  if (todolistError) handleError(todolistError)

  // If alert is enabled and email is provided, create the alert
  if (alertEnabled && email) {
    // Check if an alert already exists for this todolist
    const { data: existingAlert, error: checkError } = await (await getSupabaseClient())
      .from("todolist_alert")
      .select("id")
      .eq("todolist_id", todolist!.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking existing alert:", checkError)
    }

    // Only create alert if one doesn't already exist
    if (!existingAlert) {
      const alertData: TablesInsert<"todolist_alert"> = {
        todolist_id: todolist!.id,
        email
      }

      const { error: alertError } = await (await getSupabaseClient())
        .from("todolist_alert")
        .insert(alertData)

      if (alertError) handleError(alertError)
    } else {
      console.log(`Alert already exists for todolist ${todolist!.id}, skipping creation`)
    }
  }
  
  // Then create all tasks
  const tasksData: TablesInsert<"tasks">[] = kpiIds.map(kpiId => ({
    id: generateUUID(),
    todolist_id: todolist!.id,
    kpi_id: kpiId,
    status: "pending",
    value: null
  }))
  
  const { error: tasksError } = await (await getSupabaseClient())
    .from("tasks")
    .insert(tasksData)
  
  if (tasksError) handleError(tasksError)
  
  // Log the activity
  await logCurrentUserActivity('create_todolist', 'todolist', todolist!.id, {
    device_id: deviceId,
    kpi_count: kpiIds.length,
    scheduled_execution: startTime,
    time_slot: timeSlot,
    alert_enabled: alertEnabled,
    alert_email: email
  });
  
  revalidatePath("/todolist")
  return { id: todolist!.id }
}

// Completa una todolist e tutte le sue task
export async function completeTodolist(todolistId: string): Promise<void> {
  // Update all tasks to completed
  const { error: tasksError } = await (await getSupabaseClient())
    .from("tasks")
    .update({ status: "completed" })
    .eq("todolist_id", todolistId)
  
  if (tasksError) handleError(tasksError)
  
  // Get todolist info for logging
  const { data: todolist, error: todolistError } = await (await getSupabaseClient())
    .from("todolist")
    .select("device_id, scheduled_execution")
    .eq("id", todolistId)
    .single()
  
  if (todolistError) handleError(todolistError)
  if (!todolist) throw new Error("Todolist non trovata")
  
  // Log the activity
  await logCurrentUserActivity('complete_todolist', 'todolist', todolistId, {
    device_id: todolist.device_id,
    scheduled_execution: todolist.scheduled_execution,
    time_slot: getTimeSlotFromDateTime(todolist.scheduled_execution)
  });
  
  revalidatePath("/todolist")
}

export async function getTodolistByDeviceAndTimeSlot(deviceId: string, startTime: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("todolist")
    .select("id")
    .eq("device_id", deviceId)
    .eq("scheduled_execution", startTime)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("Error fetching todolist:", error)
    return null
  }

  return data
}

export async function getTodolistsForDeviceToday(deviceId: string, today: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get the start and end of today
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from("todolist")
    .select(`
      id,
      scheduled_execution,
      status,
      created_at
    `)
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startOfDay.toISOString())
    .lte("scheduled_execution", endOfDay.toISOString())
    .order("scheduled_execution", { ascending: true })

  if (error) {
    console.error("Error fetching todolists:", error)
    return null
  }

  return data
}
