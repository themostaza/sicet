'use server'

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase"
import type { Database } from "@/supabase/database.types"
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js"
import { TablesInsert } from "@/supabase/database.types"
import {
  Task,
  TaskSchema,
  TodolistParamsSchema,
  TimeSlot,
  timeSlotOrder
} from "@/lib/validation/todolist-schemas"
import { checkKpiAlerts } from "./actions-alerts"

/** -------------------------------------------------------------------------
 * 1 · SUPABASE CLIENT TIPIZZATO
 * ------------------------------------------------------------------------*/

type TasksTable = Database["public"]["Tables"]["tasks"]
type TasksRow = TasksTable["Row"]

const supabase = (): SupabaseClient<Database> =>
  createServerSupabaseClient() as SupabaseClient<Database>

/** -------------------------------------------------------------------------
 * 2 · MAPPERS
 * ------------------------------------------------------------------------*/

const toTask = (row: TasksRow): Task => ({
  id: row.id,
  device_id: row.device_id,
  kpi_id: row.kpi_id,
  scheduled_execution: row.scheduled_execution,
  status: row.status,
  value: row.value,
  completion_date: row.completion_date ?? undefined,
  created_at: row.created_at ?? undefined,
  alert_checked: row.alert_checked ?? false,
  updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString()
})

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

function handlePostgrestError(e: PostgrestError): never {
  throw new TodolistActionError(e.message || "Errore inatteso; riprova più tardi", "DATABASE_ERROR");
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

// Utility per fascia oraria
function getTimeRangeFromSlot(date: string, timeSlot: string) {
  const baseDate = new Date(`${date}T00:00:00Z`)
  let startHour = 0, endHour = 0
  switch (timeSlot) {
    case "mattina": startHour = 6; endHour = 12; break
    case "pomeriggio": startHour = 12; endHour = 18; break
    case "sera": startHour = 18; endHour = 22; break
    case "notte": startHour = 22; endHour = 6; break
    default: startHour = 0; endHour = 23
  }
  const startDate = new Date(baseDate)
  startDate.setHours(startHour, 0, 0, 0)
  const endDate = new Date(baseDate)
  if (timeSlot === "notte") endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(endHour, 0, 0, 0)
  return {
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  }
}

// Ottieni le task per una todolist (con paginazione)
export async function getTodolistTasks(params: unknown): Promise<{ tasks: Task[]; hasMore: boolean }> {
  const { deviceId, date, timeSlot, offset, limit } = TodolistParamsSchema.parse(params)
  const { startTime, endTime } = getTimeRangeFromSlot(date, timeSlot)

  const { data, count, error } = await supabase()
    .from("tasks")
    .select("*", { count: "exact" })
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startTime)
    .lte("scheduled_execution", endTime)
    .order("scheduled_execution", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) handlePostgrestError(error)
  const tasks = (data ?? []).map(toTask)
  const hasMore = count !== null ? offset + limit < count : tasks.length === limit
  return { tasks, hasMore }
}

// Aggiorna stato task
export async function updateTaskStatus(taskId: string, status: string): Promise<Task> {
  console.log(`[updateTaskStatus] Starting update for task ${taskId} with status ${status}`)
  
  // First get the task to get its KPI and device IDs
  const { data: taskData, error: taskError } = await supabase()
    .from("tasks")
    .select("kpi_id, device_id, value, alert_checked")
    .eq("id", taskId)
    .single()

  if (taskError) {
    console.error(`[updateTaskStatus] Error fetching task:`, taskError)
    handlePostgrestError(taskError)
  }
  if (!taskData) {
    console.error(`[updateTaskStatus] Task not found: ${taskId}`)
    throw new Error("Task not found")
  }

  console.log(`[updateTaskStatus] Task data:`, {
    taskId,
    kpiId: taskData.kpi_id,
    deviceId: taskData.device_id,
    hasValue: !!taskData.value,
    alertChecked: taskData.alert_checked,
    status
  })

  // Update the task status
  const { data, error } = await supabase()
    .from("tasks")
    .update({ 
      status, 
      completion_date: status === "completed" ? new Date().toISOString() : null,
      // Se il task viene completato e gli alert non sono stati ancora controllati, impostiamo alert_checked a true
      alert_checked: status === "completed" ? true : taskData.alert_checked
    })
    .eq("id", taskId)
    .select()
    .single()

  if (error) {
    console.error(`[updateTaskStatus] Error updating task:`, error)
    handlePostgrestError(error)
  }

  // Check for alerts only when completing the task and if alerts haven't been checked yet
  if (status === "completed" && taskData.value && !taskData.alert_checked) {
    console.log(`[updateTaskStatus] Checking alerts for task ${taskId}`, {
      kpiId: taskData.kpi_id,
      deviceId: taskData.device_id,
      value: taskData.value
    })
    
    try {
      await checkKpiAlerts(taskData.kpi_id, taskData.device_id, taskData.value)
      console.log(`[updateTaskStatus] Alert check completed for task ${taskId}`)
    } catch (error) {
      console.error(`[updateTaskStatus] Error checking alerts:`, error)
      // Non lanciamo l'errore per non bloccare il completamento del task
    }
  } else if (status === "completed" && taskData.alert_checked) {
    console.log(`[updateTaskStatus] Alerts already checked for task ${taskId}, skipping`)
  }

  revalidatePath("/todolist")
  return toTask(data!)
}

// Aggiorna valore task
export async function updateTaskValue(taskId: string, value: any): Promise<Task> {
  const { data, error } = await supabase()
    .from("tasks")
    .update({ value })
    .eq("id", taskId)
    .select()
    .single()

  if (error) handlePostgrestError(error)

  revalidatePath("/todolist")
  return toTask(data!)
}

// Elimina tutte le task di una todolist
export async function deleteTodolist(deviceId: string, date: string, timeSlot: string): Promise<void> {
  const { startTime, endTime } = getTimeRangeFromSlot(date, timeSlot)
  const { error } = await supabase()
    .from("tasks")
    .delete()
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startTime)
    .lte("scheduled_execution", endTime)
  if (error) handlePostgrestError(error)
  revalidatePath("/todolist")
}

// Utility per fascia oraria (sincrona)
function getTimeSlotFromDateTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr)
  const hours = date.getHours()
  if (hours >= 6 && hours < 12) return "mattina"
  if (hours >= 12 && hours < 18) return "pomeriggio"
  if (hours >= 18 && hours < 22) return "sera"
  return "notte"
}

// Ottieni tutte le todolist raggruppate per device/data/slot
export async function getTodolistsGrouped() {
  const { data, error } = await supabase()
    .from("tasks")
    .select("id, device_id, kpi_id, scheduled_execution, status, created_at")
    .order("scheduled_execution", { ascending: false })

  if (error) handlePostgrestError(error)

  // Raggruppa per device_id, data, time_slot
  const todolistGroups: Record<string, any> = {}
  for (const task of data ?? []) {
    if (!task.scheduled_execution) continue // Skip tasks without scheduled_execution
    const executionDate = task.scheduled_execution.split("T")[0]
    const timeSlot = getTimeSlotFromDateTime(task.scheduled_execution)
    const key = `${task.device_id}_${executionDate}_${timeSlot}`

    if (!todolistGroups[key]) {
      todolistGroups[key] = {
        device_id: task.device_id,
        date: executionDate,
        time_slot: timeSlot,
        tasks: [],
        status: "pending",
      }
    }
    todolistGroups[key].tasks.push(task)
  }

  // Stato todolist
  for (const key in todolistGroups) {
    const todolist = todolistGroups[key]
    const allCompleted = todolist.tasks.every((task: any) => task.status === "completed")
    if (allCompleted) {
      todolist.status = "completed"
    } else if (todolist.tasks.some((task: any) => task.status === "completed")) {
      todolist.status = "in_progress"
    } else {
      todolist.status = "pending"
    }
  }

  // Arricchisci con device_name
  const todolistsArray = Object.values(todolistGroups)
  const deviceIds = [...new Set(todolistsArray.map((item: any) => item.device_id))]
  let devicesMap: Record<string, any> = {}
  if (deviceIds.length > 0) {
    const { data: devicesData } = await supabase()
      .from("devices")
      .select("id, name")
      .in("id", deviceIds)
    devicesMap = Object.fromEntries((devicesData ?? []).map((d: any) => [d.id, d]))
  }

  return todolistsArray.map((item: any) => ({
    ...item,
    device_name: devicesMap[item.device_id]?.name || "Dispositivo sconosciuto",
    count: item.tasks.length,
  }))
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
  const todolists = await getTodolistsGrouped();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTimeSlot = getCurrentTimeSlot(now);
  const delayedTimeSlot = getTimeSlotWithDelay(now);

  const filtered = {
    all: todolists,
    today: todolists.filter(
      (item) =>
        item.date === today &&
        item.status !== "completed" &&
        !(timeSlotOrder[item.time_slot as TimeSlot] < timeSlotOrder[delayedTimeSlot])
    ),
    overdue: todolists.filter(
      (item) =>
        item.status !== "completed" &&
        (new Date(item.date) < new Date(today) ||
          (item.date === today && timeSlotOrder[item.time_slot as TimeSlot] < timeSlotOrder[delayedTimeSlot]))
    ),
    future: todolists.filter(
      (item) =>
        item.status !== "completed" &&
        (new Date(item.date) > new Date(today) ||
          (item.date === today && timeSlotOrder[item.time_slot as TimeSlot] > timeSlotOrder[delayedTimeSlot]))
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
}

// Define a UUID generator function
function generateUUID(): string {
  return crypto.randomUUID();
}

// Crea task per todolist
export async function createTodolist(deviceId: string, date: string, timeSlot: string, kpiId: string): Promise<Task> {
  const { startTime } = getTimeRangeFromSlot(date, timeSlot)
  
  const insertData: TablesInsert<"tasks"> = {
    id: generateUUID(),
    device_id: deviceId,
    kpi_id: kpiId,
    scheduled_execution: startTime,
    status: "pending",
    value: null
  }
  
  const { data, error } = await supabase()
    .from("tasks")
    .insert(insertData)
    .select()
    .single()
  
  if (error) handlePostgrestError(error)
  
  revalidatePath("/todolist")
  return toTask(data!)
}

// Utility per creare multiple task
export async function createMultipleTasks(deviceId: string, date: string, timeSlot: string, kpiIds: string[]): Promise<void> {
  const { startTime } = getTimeRangeFromSlot(date, timeSlot)
  
  const tasksToInsert: TablesInsert<"tasks">[] = kpiIds.map(kpiId => ({
    id: generateUUID(),
    device_id: deviceId,
    kpi_id: kpiId,
    scheduled_execution: startTime,
    status: "pending",
    value: null
  }))
  
  const { error } = await supabase()
    .from("tasks")
    .insert(tasksToInsert)
  
  if (error) handlePostgrestError(error)
  
  revalidatePath("/todolist")
}

// Check for existing tasks with the same date-device-KPI tuple
export async function checkExistingTasks(deviceId: string, date: string, timeSlot: string, kpiIds: string[]): Promise<{ exists: boolean; existingTasks: Task[] }> {
  const { startTime, endTime } = getTimeRangeFromSlot(date, timeSlot)
  
  const { data, error } = await supabase()
    .from("tasks")
    .select("id, device_id, kpi_id, scheduled_execution, status, value, completion_date, created_at, alert_checked, updated_at")
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startTime)
    .lte("scheduled_execution", endTime)
    .in("kpi_id", kpiIds)
  
  if (error) handlePostgrestError(error)
  
  const existingTasks = (data ?? []).map(toTask)
  
  return {
    exists: existingTasks.length > 0,
    existingTasks
  }
}
