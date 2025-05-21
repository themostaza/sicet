'use server'

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase"
import type { Database } from "@/supabase/database.types"
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js"
import { TablesInsert } from "@/supabase/database.types"

/** -------------------------------------------------------------------------
 * 1 · VALIDAZIONE ZOD
 * ------------------------------------------------------------------------*/

const TaskBase = z.object({
  id: z.string(),
  device_id: z.string(),
  kpi_id: z.string(),
  scheduled_execution: z.string(),
  status: z.string(),
  value: z.any().optional(),
  completion_date: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
})
export type Task = z.infer<typeof TaskBase>

const ListParamsSchema = z.object({
  deviceId: z.string(),
  date: z.string(), // formato YYYY-MM-DD
  timeSlot: z.string(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** -------------------------------------------------------------------------
 * 2 · SUPABASE CLIENT TIPIZZATO
 * ------------------------------------------------------------------------*/

type TasksTable = Database["public"]["Tables"]["tasks"]
export type TasksRow = TasksTable["Row"]

const supabase = (): SupabaseClient<Database> =>
  createServerSupabaseClient() as SupabaseClient<Database>

/** -------------------------------------------------------------------------
 * 3 · MAPPERS
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
})

/** -------------------------------------------------------------------------
 * 4 · ERROR HANDLING
 * ------------------------------------------------------------------------*/

function handlePostgrestError(e: PostgrestError): never {
  throw new Error(e.message || "Errore inatteso; riprova più tardi")
}

/** -------------------------------------------------------------------------
 * 5 · SERVER ACTIONS
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
  const { deviceId, date, timeSlot, offset, limit } = ListParamsSchema.parse(params)
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
  const { data, error } = await supabase()
    .from("tasks")
    .update({ status, completion_date: status === "completed" ? new Date().toISOString() : null })
    .eq("id", taskId)
    .select()
    .single()
  if (error) handlePostgrestError(error)
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

  const filteredTodolists = {
    all: todolistsArray,
    today: todolistsArray.filter((item: any) => item.date === new Date().toISOString().split("T")[0]),
    overdue: todolistsArray.filter((item: any) => item.date < new Date().toISOString().split("T")[0]),
    future: todolistsArray.filter((item: any) => item.date > new Date().toISOString().split("T")[0]),
    completed: todolistsArray.filter((item: any) => item.status === "completed"),
  }
  const counts = {
    all: filteredTodolists.all.length,
    today: filteredTodolists.today.length,
    overdue: filteredTodolists.overdue.length,
    future: filteredTodolists.future.length,
    completed: filteredTodolists.completed.length,
  }

  return todolistsArray.map((item: any) => ({
    ...item,
    device_name: devicesMap[item.device_id]?.name || "Dispositivo sconosciuto",
    count: item.tasks.length,
  }))
}

type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte";

const timeSlotOrder: Record<string, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
};

function getCurrentTimeSlot(dateObj: Date): TimeSlot {
  const hours = dateObj.getHours();
  if (hours >= 6 && hours < 14) return "mattina";
  if (hours >= 14 && hours < 22) return "pomeriggio";
  return "notte";
}

export async function getTodolistsGroupedWithFilters() {
  const todolists = await getTodolistsGrouped(); // la tua funzione che raggruppa

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTimeSlot = getCurrentTimeSlot(now);

  const filtered = {
    all: todolists,
    today: todolists.filter(
      (item) =>
        item.date === today &&
        item.status !== "completed" &&
        !(timeSlotOrder[item.time_slot as TimeSlot] < timeSlotOrder[currentTimeSlot])
    ),
    overdue: todolists.filter(
      (item) =>
        item.status !== "completed" &&
        (new Date(item.date) < new Date(today) ||
          (item.date === today && timeSlotOrder[item.time_slot as TimeSlot] < timeSlotOrder[currentTimeSlot]))
    ),
    future: todolists.filter(
      (item) =>
        item.status !== "completed" &&
        (new Date(item.date) > new Date(today) ||
          (item.date === today && timeSlotOrder[item.time_slot as TimeSlot] > timeSlotOrder[currentTimeSlot]))
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
    id: generateUUID(), // Generate UUID for client-side
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
    id: generateUUID(), // Generate UUID for each task
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
