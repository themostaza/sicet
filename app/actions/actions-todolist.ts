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
  isTodolistCurrentlyValid,
  getTodolistDeadlineDisplay,
  isTodolistInGracePeriod,
  toTask,
  toTodolist,
  isCustomTimeSlot,
  isCustomTimeSlotString,
  parseCustomTimeSlotString,
  timeToMinutes,

  getTimeSlotDatabaseValues,
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
 * CATEGORIES
 * ------------------------------------------------------------------------*/

// Get all existing todolist categories from database
export async function getTodolistCategories(): Promise<string[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from("todolist")
      .select("todolist_category")
      .not("todolist_category", "is", null)
      .not("todolist_category", "eq", "")
    
    if (error) {
      console.error("Error fetching todolist categories:", error)
      return []
    }
    
    // Extract unique categories and filter out nulls/empty strings
    const categories = [...new Set(
      data
        .map(item => item.todolist_category)
        .filter((category): category is string => 
          category !== null && category !== undefined && category.trim() !== ""
        )
    )].sort()
    
    return categories
  } catch (error) {
    console.error("Error in getTodolistCategories:", error)
    return []
  }
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
  
  // scheduled_execution is always midnight
  const scheduledExecution = `${date}T00:00:00`

  const { data, error } = await (await getSupabaseClient())
    .from("todolist")
    .select("*")
    .eq("device_id", deviceId)
    .eq("scheduled_execution", scheduledExecution)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // Not found
    handleError(error)
  }

  return data ? toTodolist({
    ...data,
    status: data.status as "pending" | "in_progress" | "completed"
  }) : null
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
  // scheduled_execution is always midnight
  const scheduledExecution = `${date}T00:00:00`
  
  // Get todolist info before deleting for logging
  const { data: todolistData, error: todolistError } = await (await getSupabaseClient())
    .from("todolist")
    .select("id")
    .eq("device_id", deviceId)
    .eq("scheduled_execution", scheduledExecution)
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
        scheduled_execution: scheduledExecution,
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
        
        // Determine time slot based on type and stored values
        if (item.time_slot_type === "custom" && item.time_slot_start !== null && item.time_slot_end !== null) {
          // Custom time slot - convert from minutes to hours and minutes
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
        } else if (item.time_slot_type === "standard" && item.time_slot_start !== null && item.time_slot_end !== null) {
          // Standard time slot - reconstruct from stored values
          const startTime = minutesToTime(item.time_slot_start)
          const endTime = minutesToTime(item.time_slot_end)
          
          // Map to standard time slot
          if (startTime.hour === 6 && endTime.hour === 14) {
            timeSlotValue = "mattina"
          } else if (startTime.hour === 14 && endTime.hour === 22) {
            timeSlotValue = "pomeriggio"
          } else if (startTime.hour === 22 && endTime.hour === 6) {
            timeSlotValue = "notte"
          } else if (startTime.hour === 7 && endTime.hour === 17) {
            timeSlotValue = "giornata"
          } else {
            // Fallback to custom if no match
            const customSlot: CustomTimeSlot = {
              type: "custom",
              startHour: startTime.hour,
              startMinute: startTime.minute,
              endHour: endTime.hour,
              endMinute: endTime.minute
            }
            timeSlotValue = customSlot
          }
        } else {
          // Fallback for old data - reconstruct from scheduled_execution
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
          created_at: item.created_at ?? "N/A",
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
      created_at: string | "N/A"
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
          !isTodolistExpired(item.scheduled_execution, item.time_slot_type, item.time_slot_end, item.time_slot_start)
      ),
      overdue: todolists.filter(
        (item) =>
          item.status !== "completed" &&
          isTodolistExpired(item.scheduled_execution, item.time_slot_type, item.time_slot_end, item.time_slot_start)
      ),
      future: todolists.filter(
        (item) =>
          item.status !== "completed" &&
          new Date(item.date) > new Date(today) &&
          !isTodolistExpired(item.scheduled_execution, item.time_slot_type, item.time_slot_end, item.time_slot_start)
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
  email?: string,
  category?: string
): Promise<Task> {
  // Get time slot database values
  const dbValues = getTimeSlotDatabaseValues(timeSlot)
  
  // scheduled_execution is always midnight
  const scheduledExecution = `${date}T00:00:00`
  
  // First create the todolist
  const todolistData: TablesInsert<"todolist"> = {
    id: generateUUID(),
    device_id: deviceId,
    scheduled_execution: scheduledExecution,
    status: "pending",
    time_slot_type: dbValues.type,
    time_slot_start: dbValues.start,
    time_slot_end: dbValues.end
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
    scheduled_execution: scheduledExecution,
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
  email?: string,
  category?: string
): Promise<{ id: string }> {
  // Get time slot database values
  const dbValues = getTimeSlotDatabaseValues(timeSlot)
  
  // scheduled_execution is always midnight
  const scheduledExecution = `${date}T00:00:00`
  
  // First create the todolist
  const todolistData: TablesInsert<"todolist"> = {
    id: generateUUID(),
    device_id: deviceId,
    scheduled_execution: scheduledExecution,
    status: "pending",
    time_slot_type: dbValues.type,
    time_slot_start: dbValues.start,
    time_slot_end: dbValues.end,
    todolist_category: category || null
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
    scheduled_execution: scheduledExecution,
    time_slot: timeSlot,
    alert_enabled: alertEnabled,
    alert_email: email
  });
  
  revalidatePath("/todolist")
  return { id: todolist!.id }
}

// Completa una todolist e tutte le sue task
export async function completeTodolist(todolistId: string): Promise<void> {
  // Prima ottieni i dati della todolist per verificare se è scaduta
  const { data: todolist, error: todolistError } = await (await getSupabaseClient())
    .from("todolist")
    .select("device_id, scheduled_execution, status, time_slot_type, time_slot_end, time_slot_start")
    .eq("id", todolistId)
    .single()
  
  if (todolistError) handleError(todolistError)
  if (!todolist) throw new Error("Todolist non trovata")
  
  // Verifica se la todolist è scaduta e non è già completata
  if (todolist.status !== "completed" && isTodolistExpired(
    todolist.scheduled_execution, 
    todolist.time_slot_type as "standard" | "custom", 
    todolist.time_slot_end,
    todolist.time_slot_start
  )) {
    throw new Error("Non è possibile completare una todolist scaduta")
  }

  // Ottieni l'ID dell'utente corrente
  const { data: { user }, error: authError } = await (await getSupabaseClient()).auth.getUser()
  if (authError || !user) {
    throw new Error("Utente non autenticato")
  }
  
  // Update all tasks to completed
  const { error: tasksError } = await (await getSupabaseClient())
    .from("tasks")
    .update({ status: "completed" })
    .eq("todolist_id", todolistId)
  
  if (tasksError) handleError(tasksError)

  // Update todolist to completed with completion data
  const { error: todolistUpdateError } = await (await getSupabaseClient())
    .from("todolist")
    .update({ 
      status: "completed",
      completion_date: new Date().toISOString(),
      completed_by: user.id
    })
    .eq("id", todolistId)
  
  if (todolistUpdateError) handleError(todolistUpdateError)
  
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
  
  // Get a wider date range to catch overnight slots
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfNextDay = new Date(today)
  endOfNextDay.setDate(endOfNextDay.getDate() + 1)
  endOfNextDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from("todolist")
    .select(`
      id,
      scheduled_execution,
      status,
      time_slot_type,
      time_slot_start,
      time_slot_end,
      created_at
    `)
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startOfDay.toISOString())
    .lte("scheduled_execution", endOfNextDay.toISOString())
    .order("scheduled_execution", { ascending: true })

  if (error) {
    console.error("Error fetching todolists:", error)
    return null
  }

  // Filtra usando la nuova logica: solo todolist attualmente valide (già iniziate e non scadute)
  const filteredData = data?.filter(todolist => 
    isTodolistCurrentlyValid(
      todolist.scheduled_execution,
      todolist.time_slot_start,
      todolist.time_slot_end,
      todolist.status
    )
  ) || []

  return filteredData
}

// Ottieni i dati completi di una todolist per ID
export async function getTodolistById(todolistId: string) {
  const { data, error } = await (await getSupabaseClient())
    .from("todolist")
    .select(`
      id,
      device_id,
      scheduled_execution,
      status,
      time_slot_type,
      time_slot_start,
      time_slot_end,
      created_at,
      updated_at,
      completion_date
    `)
    .eq("id", todolistId)
    .single()

  if (error) {
    console.error("Error fetching todolist:", error)
    return null
  }

  return data
}

// Ottieni le todolist con paginazione per infinite scroll
export async function getTodolistsWithPagination(params: {
  filter: "all" | "today" | "overdue" | "future" | "completed"
  offset: number
  limit: number
  selectedDate?: string
  selectedDevice?: string
  selectedTags?: string[]
  selectedCategory?: string
  sortColumn?: string
  sortDirection?: string
  userRole?: string
}) {
  try {
    const { filter, offset, limit, selectedDate, selectedDevice, selectedTags, selectedCategory, sortColumn, sortDirection, userRole } = params
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
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
        todolist_category,
        devices (
          name,
          tags
        ),
        tasks (
          id,
          kpi_id,
          status
        )
      `, { count: "exact" })

    // Apply filters
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    if (filter === "today") {
      if (userRole === "operator") {
        // Per gli operator, usa un range più ampio per catturare gli slot overnight
        // Usa orario italiano invece che orario server
        console.log("=== DEBUG OPERATOR FILTER ===")
        
        const nowItaly = new Date().toLocaleString("sv-SE", {timeZone: "Europe/Rome"})
        const todayItaly = nowItaly.split(" ")[0]
        console.log("nowItaly:", nowItaly)
        console.log("todayItaly:", todayItaly)
        
        // Crea le date esplicitamente in fuso orario italiano
        const startOfTodayItaly = new Date(`${todayItaly}T00:00:00+02:00`) // CEST (estate)
        const endOfTomorrowItaly = new Date(`${todayItaly}T23:59:59+02:00`)
        endOfTomorrowItaly.setDate(endOfTomorrowItaly.getDate() + 1)
        
        console.log("startOfTodayItaly (locale):", startOfTodayItaly.toISOString())
        console.log("endOfTomorrowItaly (locale):", endOfTomorrowItaly.toISOString())
        
        // Aggiusta per il fuso orario italiano (CET = UTC+1, CEST = UTC+2)
        const offsetMinutes = startOfTodayItaly.getTimezoneOffset()
        console.log("offsetMinutes:", offsetMinutes)
        
        const startOfToday = new Date(startOfTodayItaly.getTime() - (offsetMinutes * 60000))
        const endOfTomorrow = new Date(endOfTomorrowItaly.getTime() - (offsetMinutes * 60000))
        
        console.log("Range finale:")
        console.log("startOfToday:", startOfToday.toISOString())
        console.log("endOfTomorrow:", endOfTomorrow.toISOString())
        console.log("=== END DEBUG ===");
        
        query = query
          .gte("scheduled_execution", startOfToday.toISOString())
          .lte("scheduled_execution", endOfTomorrow.toISOString())
      } else {
        // Logica standard per admin/referrer
        query = query
          .gte("scheduled_execution", `${today}T00:00:00`)
          .lt("scheduled_execution", `${today}T23:59:59`)
      }
    } else if (filter === "overdue") {
      query = query
        .neq("status", "completed")
        .lt("scheduled_execution", now.toISOString())
    } else if (filter === "future") {
      query = query
        .neq("status", "completed")
        .gt("scheduled_execution", `${today}T23:59:59`)
    } else if (filter === "completed") {
      query = query.eq("status", "completed")
    }

    // Apply date filter if specified
    if (selectedDate) {
      query = query
        .gte("scheduled_execution", `${selectedDate}T00:00:00`)
        .lt("scheduled_execution", `${selectedDate}T23:59:59`)
    }

    // Apply device filter if specified
    if (selectedDevice && selectedDevice !== "all") {
      query = query.eq("device_id", selectedDevice)
    }

    // Apply category filter if specified
    if (selectedCategory && selectedCategory !== "all") {
      query = query.eq("todolist_category", selectedCategory)
    }

    // Apply pagination and ordering
    // Valid columns for ordering
    const validSortColumns = [
      "scheduled_execution",
      "created_at",
      "status",
      "count",
      "device_name",
      "time_slot"
    ]
    let orderCol = "scheduled_execution"
    let orderAsc = false
    if (sortColumn && validSortColumns.includes(sortColumn)) {
      orderCol = sortColumn
      if (typeof sortDirection === "string" && sortDirection.toLowerCase() === "asc") {
        orderAsc = true
      }
    }
    // For device_name and count, we need to sort after fetching (not supported nativamente da supabase su join/aggregati)
    let data, count, error
    if (orderCol === "device_name" || orderCol === "count") {
      // Fallback: order by scheduled_execution, sort after fetch
      ({ data, count, error } = await query
        .order("scheduled_execution", { ascending: false })
        .range(offset, offset + limit - 1))
    } else {
      ({ data, count, error } = await query
        .order(orderCol, { ascending: orderAsc })
        .range(offset, offset + limit - 1))
    }

    if (error) {
      console.error("Error fetching todolists with pagination:", error)
      throw new TodolistActionError(
        "Errore nel recupero delle todolist",
        "FETCH_ERROR"
      )
    }

    if (!data) {
      return { todolists: [], hasMore: false, totalCount: 0 }
    }

    // Process todolists and apply tag filtering
    const processedTodolists = data
      .map((item) => {
        try {
          const date = new Date(item.scheduled_execution).toISOString().split("T")[0]
          let timeSlotValue: TimeSlotValue
          
          // Determine time slot based on type and stored values
          if (item.time_slot_type === "custom" && item.time_slot_start !== null && item.time_slot_end !== null) {
            // Custom time slot - convert from minutes to hours and minutes
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
          } else if (item.time_slot_type === "standard" && item.time_slot_start !== null && item.time_slot_end !== null) {
            // Standard time slot - reconstruct from stored values
            const startTime = minutesToTime(item.time_slot_start)
            const endTime = minutesToTime(item.time_slot_end)
            
            // Map to standard time slot
            if (startTime.hour === 6 && endTime.hour === 14) {
              timeSlotValue = "mattina"
            } else if (startTime.hour === 14 && endTime.hour === 22) {
              timeSlotValue = "pomeriggio"
            } else if (startTime.hour === 22 && endTime.hour === 6) {
              timeSlotValue = "notte"
            } else if (startTime.hour === 7 && endTime.hour === 17) {
              timeSlotValue = "giornata"
            } else {
              // Fallback to custom if no match
              const customSlot: CustomTimeSlot = {
                type: "custom",
                startHour: startTime.hour,
                startMinute: startTime.minute,
                endHour: endTime.hour,
                endMinute: endTime.minute
              }
              timeSlotValue = customSlot
            }
          } else {
            // Fallback for old data - reconstruct from scheduled_execution
            const standardSlot = getTimeSlotFromDateTime(item.scheduled_execution)
            timeSlotValue = standardSlot
          }
          
          return {
            id: item.id,
            device_id: item.device_id,
            device_name: item.devices?.name || "Unknown Device",
            device_tags: item.devices?.tags || [],
            date,
            time_slot: timeSlotValue,
            scheduled_execution: item.scheduled_execution,
            status: item.status as "pending" | "in_progress" | "completed",
            count: item.tasks ? item.tasks.length : 0,
            time_slot_type: item.time_slot_type,
            time_slot_start: item.time_slot_start,
            time_slot_end: item.time_slot_end,
            todolist_category: item.todolist_category,
            created_at: item.created_at ?? "N/A",
            tasks: item.tasks || []
          }
        } catch (err) {
          console.error("Error processing todolist item:", err, item)
          return null
        }
      })
      .filter(Boolean) as Array<{
        id: string
        device_id: string
        device_name: string
        device_tags: string[]
        date: string
        time_slot: TimeSlotValue
        scheduled_execution: string
        status: "pending" | "in_progress" | "completed"
        count: number
        time_slot_type: "standard" | "custom"
        time_slot_start: number | null
        time_slot_end: number | null
        todolist_category: string | null
        created_at: string | "N/A"
        tasks: Array<{ id: string; kpi_id: string; status: string }>
      }>

    // Apply tag filtering if specified
    let filteredTodolists = processedTodolists
    if (selectedTags && selectedTags.length > 0) {
      filteredTodolists = processedTodolists.filter(todolist => 
        selectedTags.some(selectedTag => todolist.device_tags.includes(selectedTag))
      )
    }
    
    // Apply operator-specific filtering for "today" filter
    if (userRole === "operator" && filter === "today") {
      filteredTodolists = filteredTodolists.filter(todolist => 
        isTodolistCurrentlyValid(
          todolist.scheduled_execution,
          todolist.time_slot_start,
          todolist.time_slot_end,
          todolist.status
        )
      )
    }
    // Applico ordinamento lato server per device_name e count (non supportato da supabase)
    let finalTodolists = filteredTodolists
    if (orderCol === "device_name") {
      finalTodolists = [...filteredTodolists].sort((a, b) => {
        if (orderAsc) {
          return a.device_name.localeCompare(b.device_name)
        } else {
          return b.device_name.localeCompare(a.device_name)
        }
      })
    } else if (orderCol === "count") {
      finalTodolists = [...filteredTodolists].sort((a, b) => {
        if (orderAsc) {
          return a.count - b.count
        } else {
          return b.count - a.count
        }
      })
    }
    const hasMore = count !== null ? offset + limit < count : finalTodolists.length === limit

    return {
      todolists: finalTodolists,
      hasMore,
      totalCount: count || 0
    }
  } catch (err) {
    console.error("Unexpected error in getTodolistsWithPagination:", err)
    throw new TodolistActionError(
      "Errore inatteso nel recupero delle todolist",
      "UNEXPECTED_ERROR"
    )
  }
}

// Ottieni la mail dell'utente che ha completato una todolist
export async function getTodolistCompletionUserEmail(todolistId: string): Promise<string | null> {
  const supabase = await getSupabaseClient();
  
  // Prima cerca direttamente dal campo completed_by nella todolist
  const { data: todolist, error: todolistError } = await supabase
    .from('todolist')
    .select('completed_by')
    .eq('id', todolistId)
    .maybeSingle();
    
  if (todolistError) {
    console.error('Errore nel recupero todolist:', todolistError);
    return null;
  }
  
  let userId = todolist?.completed_by;
  
  // Se non trovato nel campo completed_by, cerca nelle attività (fallback per todolist completate prima di questo aggiornamento)
  if (!userId) {
    const { data: activity, error: activityError } = await supabase
      .from('user_activities')
      .select('user_id')
      .eq('entity_id', todolistId)
      .eq('action_type', 'complete_todolist')
      .maybeSingle();
      
    if (activityError) {
      console.error('Errore nel recupero attività di completamento:', activityError);
      return null;
    }
    userId = activity?.user_id;
  }
  
  if (!userId) return null;
  
  // Recupera l'email dal profilo usando auth_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('auth_id', userId)
    .maybeSingle();
    
  if (profileError) {
    console.error('Errore nel recupero profilo utente:', profileError);
    return null;
  }
  
  return profile?.email ?? null;
}
