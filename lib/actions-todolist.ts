"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "./supabase"

// Tipo per le task
interface Task {
  id: string
  device_id: string
  kpi_id: string
  scheduled_execution: string // timestamp
  status: string
  value?: any
  completion_date?: string
  created_at?: string
}

// Funzione per generare un ID univoco
function generateId() {
  return `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

// Ottieni tutti i gruppi di task (todolist)
export async function getTodolists() {
  const supabase = createServerSupabaseClient()
  const today = new Date()

  // Ottieni tutte le task
  const { data, error } = await supabase
    .from("tasks")
    .select("id, device_id, kpi_id, scheduled_execution, status, created_at")
    .order("scheduled_execution", { ascending: false })

  if (error) {
    console.error("Errore nel recupero delle task:", error)
    throw new Error("Impossibile recuperare le task")
  }

  // Raggruppa le task per device_id e data (senza considerare l'ora)
  const todolistGroups = data.reduce((groups, task) => {
    // Estrai solo la data da scheduled_execution
    const executionDate = task.scheduled_execution.split("T")[0]
    const timeSlot = getTimeSlotFromDateTime(task.scheduled_execution)

    // Crea una chiave unica per ogni todolist (device + data + fascia oraria)
    const key = `${task.device_id}_${executionDate}_${timeSlot}`

    if (!groups[key]) {
      groups[key] = {
        device_id: task.device_id,
        date: executionDate,
        time_slot: timeSlot,
        tasks: [],
        status: "pending", // Stato iniziale
      }
    }

    groups[key].tasks.push(task)

    return groups
  }, {})

  // Determina lo stato di ogni todolist in base allo stato delle sue task
  for (const key in todolistGroups) {
    const todolist = todolistGroups[key]
    const allCompleted = todolist.tasks.every((task) => task.status === "completed")

    if (allCompleted) {
      todolist.status = "completed"
    } else if (todolist.tasks.some((task) => task.status === "completed")) {
      todolist.status = "in_progress"
    } else {
      todolist.status = "pending"
    }
  }

  // Converti l'oggetto in array
  const todolistsArray = Object.values(todolistGroups)

  // Arricchimento dati con informazioni sui dispositivi
  const deviceIds = [...new Set(todolistsArray.map((item: any) => item.device_id))]

  if (deviceIds.length > 0) {
    const { data: devicesData, error: devicesError } = await supabase
      .from("devices")
      .select("id, name")
      .in("id", deviceIds)

    if (devicesError) {
      console.error("Errore nel recupero dei dispositivi:", devicesError)
    } else {
      // Mappa dei dispositivi per id
      const devicesMap = Object.fromEntries(devicesData.map((device) => [device.id, device]))

      // Aggiungi i nomi dei dispositivi e conta le task
      return todolistsArray.map((item: any) => ({
        ...item,
        device_name: devicesMap[item.device_id]?.name || "Dispositivo sconosciuto",
        count: item.tasks.length,
      }))
    }
  }

  return todolistsArray.map((item: any) => ({
    ...item,
    count: item.tasks.length,
  }))
}

// Ottieni le task per una specifica todolist (device, data, fascia oraria)
export async function getTodolistTasks(deviceId: string, date: string, timeSlot: string) {
  const supabase = createServerSupabaseClient()

  // Converti la data e la fascia oraria in un intervallo di timestamp
  const { startTime, endTime } = getTimeRangeFromSlot(date, timeSlot)

  // First, fetch the tasks without trying to join with kpis
  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select("id, device_id, kpi_id, scheduled_execution, status, value, completion_date")
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startTime)
    .lte("scheduled_execution", endTime)
    .order("scheduled_execution", { ascending: true })

  if (tasksError) {
    console.error("Errore nel recupero delle task:", tasksError)
    throw new Error("Impossibile recuperare le task della todolist")
  }

  if (!tasksData || tasksData.length === 0) {
    return []
  }

  // Extract all kpi_ids from the tasks
  const kpiIds = [...new Set(tasksData.map((task) => task.kpi_id))]

  // Then, fetch the KPIs separately
  const { data: kpisData, error: kpisError } = await supabase.from("kpis").select("id, name").in("id", kpiIds)

  if (kpisError) {
    console.error("Errore nel recupero dei KPI:", kpisError)
    throw new Error("Impossibile recuperare i dati dei KPI")
  }

  // Create a map of KPIs by id for easy lookup
  const kpisMap = Object.fromEntries(kpisData.map((kpi) => [kpi.id, kpi]))

  // Combine the data
  const combinedData = tasksData.map((task) => ({
    ...task,
    kpis: kpisMap[task.kpi_id] || { id: task.kpi_id, name: "KPI sconosciuto" },
  }))

  return combinedData
}

// Crea una nuova task
export async function createTask(task: Omit<Task, "id" | "created_at">): Promise<Task> {
  const supabase = createServerSupabaseClient()

  // Genera un ID univoco
  const id = generateId()
  const nuovaTask = {
    ...task,
    id,
  }

  const { data, error } = await supabase.from("tasks").insert([nuovaTask]).select()

  if (error) {
    console.error("Errore nella creazione della task:", error)
    throw new Error("Impossibile creare la task")
  }

  return data[0]
}

// Crea più task contemporaneamente (una todolist)
export async function createTodolist(deviceId: string, scheduledDate: string, timeSlot: string, kpiIds: string[]) {
  const supabase = createServerSupabaseClient()

  // Converti la data e la fascia oraria in un timestamp
  const scheduledExecution = getTimestampFromSlot(scheduledDate, timeSlot)

  const tasks = kpiIds.map((kpiId) => ({
    id: generateId(),
    device_id: deviceId,
    kpi_id: kpiId,
    scheduled_execution: scheduledExecution,
    status: "pending", // Cambiato da "planned" a "pending"
  }))

  const { data, error } = await supabase.from("tasks").insert(tasks).select()

  if (error) {
    console.error("Errore nella creazione delle task:", error)
    throw new Error("Impossibile creare la todolist")
  }

  revalidatePath("/todolist")
  return data
}

// Aggiorna lo stato di una task
export async function updateTaskStatus(taskId: string, status: string): Promise<Task> {
  const supabase = createServerSupabaseClient()

  const updates: any = { status }

  // Se lo stato è "completed", aggiungi la data di completamento
  if (status === "completed") {
    updates.completion_date = new Date().toISOString()
  }

  const { data, error } = await supabase.from("tasks").update(updates).eq("id", taskId).select()

  if (error) {
    console.error("Errore nell'aggiornamento della task:", error)
    throw new Error("Impossibile aggiornare la task")
  }

  if (!data || data.length === 0) {
    throw new Error("Task non trovata")
  }

  // Dopo aver aggiornato lo stato della task, verifica se tutte le task della todolist sono completate
  const task = data[0]
  await updateTodolistStatusIfNeeded(task.device_id, task.scheduled_execution)

  revalidatePath("/todolist")
  return data[0]
}

// Funzione per verificare e aggiornare lo stato di una todolist se necessario
async function updateTodolistStatusIfNeeded(deviceId: string, scheduledExecution: string) {
  const supabase = createServerSupabaseClient()

  // Estrai la data e la fascia oraria dal timestamp
  const date = scheduledExecution.split("T")[0]
  const timeSlot = getTimeSlotFromDateTime(scheduledExecution)

  // Ottieni l'intervallo di timestamp per la fascia oraria
  const { startTime, endTime } = getTimeRangeFromSlot(date, timeSlot)

  // Ottieni tutte le task per questa todolist
  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startTime)
    .lte("scheduled_execution", endTime)

  if (tasksError || !tasksData) {
    console.error("Errore nel recupero delle task per aggiornamento stato todolist:", tasksError)
    return
  }

  // Verifica se tutte le task sono completate
  const allCompleted = tasksData.every((task) => task.status === "completed")

  // Se tutte le task sono completate, aggiorna lo stato di tutte le task per riflettere che la todolist è completata
  // Questo è un modo indiretto per marcare la todolist come completata, poiché non abbiamo una tabella separata per le todolist
  if (allCompleted) {
    console.log("Tutte le task sono completate, aggiornando lo stato della todolist")
    // Non è necessario fare nulla qui, poiché lo stato della todolist viene calcolato dinamicamente in getTodolists()
  }
}

// Aggiorna il valore di una task
export async function updateTaskValue(taskId: string, value: any): Promise<Task> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("tasks").update({ value }).eq("id", taskId).select()

  if (error) {
    console.error("Errore nell'aggiornamento del valore della task:", error)
    throw new Error("Impossibile aggiornare il valore della task")
  }

  if (!data || data.length === 0) {
    throw new Error("Task non trovata")
  }

  revalidatePath("/todolist")
  return data[0]
}

// Elimina tutte le task di una todolist
export async function deleteTodolist(deviceId: string, date: string, timeSlot: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  // Converti la data e la fascia oraria in un intervallo di timestamp
  const { startTime, endTime } = getTimeRangeFromSlot(date, timeSlot)

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startTime)
    .lte("scheduled_execution", endTime)

  if (error) {
    console.error("Errore nell'eliminazione della todolist:", error)
    throw new Error("Impossibile eliminare la todolist")
  }

  revalidatePath("/todolist")
}

// Modifica la funzione getTodayTodolistForDevice per usare correttamente il filtro per data
// Sostituisci la funzione esistente con questa versione corretta

// Ottieni la todolist di oggi per un dispositivo specifico
export async function getTodayTodolistForDevice(deviceId: string) {
  const supabase = createServerSupabaseClient()

  // Ottieni la data di oggi in formato ISO
  const today = new Date().toISOString().split("T")[0]

  // Crea l'intervallo di date per oggi (dall'inizio alla fine della giornata)
  const startOfDay = `${today}T00:00:00Z`
  const endOfDay = `${today}T23:59:59Z`

  // Ottieni tutte le task per il dispositivo e la data di oggi
  const { data, error } = await supabase
    .from("tasks")
    .select("id, device_id, kpi_id, scheduled_execution, status")
    .eq("device_id", deviceId)
    .gte("scheduled_execution", startOfDay)
    .lte("scheduled_execution", endOfDay)
    .order("scheduled_execution", { ascending: true })

  if (error) {
    console.error("Errore nel recupero delle task:", error)
    throw new Error("Impossibile recuperare le task")
  }

  if (!data || data.length === 0) {
    return null
  }

  // Raggruppa per fascia oraria
  const todolistsByTimeSlot = data.reduce((groups, task) => {
    const timeSlot = getTimeSlotFromDateTime(task.scheduled_execution)

    if (!groups[timeSlot]) {
      groups[timeSlot] = {
        device_id: deviceId,
        date: today,
        time_slot: timeSlot,
        tasks: [],
      }
    }

    groups[timeSlot].tasks.push(task)
    return groups
  }, {})

  // Prendi la prima todolist disponibile (se ce ne sono più di una per fasce orarie diverse)
  const timeSlots = Object.keys(todolistsByTimeSlot)
  if (timeSlots.length === 0) {
    return null
  }

  return todolistsByTimeSlot[timeSlots[0]]
}

// Funzione di utilità per ottenere un timestamp da una data e una fascia oraria
async function getTimestampFromSlot(date: string, timeSlot: string): Promise<string> {
  // Converti la data in un oggetto Date
  const baseDate = new Date(`${date}T00:00:00Z`)

  // Aggiungi ore in base alla fascia oraria
  switch (timeSlot) {
    case "mattina":
      baseDate.setHours(9, 0, 0) // 9:00
      break
    case "pomeriggio":
      baseDate.setHours(14, 0, 0) // 14:00
      break
    case "sera":
      baseDate.setHours(19, 0, 0) // 19:00
      break
    case "notte":
      baseDate.setHours(23, 0, 0) // 23:00
      break
    default:
      baseDate.setHours(12, 0, 0) // Default: mezzogiorno
  }

  return baseDate.toISOString()
}

// Funzione di utilità per ottenere un intervallo di timestamp da una data e una fascia oraria
async function getTimeRangeFromSlot(date: string, timeSlot: string): Promise<{ startTime: string; endTime: string }> {
  // Converti la data in un oggetto Date
  const baseDate = new Date(`${date}T00:00:00Z`)

  let startHour = 0
  let endHour = 0

  // Imposta le ore di inizio e fine in base alla fascia oraria
  switch (timeSlot) {
    case "mattina":
      startHour = 6
      endHour = 12
      break
    case "pomeriggio":
      startHour = 12
      endHour = 18
      break
    case "sera":
      startHour = 18
      endHour = 22
      break
    case "notte":
      startHour = 22
      endHour = 6 // Il giorno dopo
      break
    default:
      startHour = 0
      endHour = 23
  }

  const startDate = new Date(baseDate)
  startDate.setHours(startHour, 0, 0, 0)

  const endDate = new Date(baseDate)
  if (timeSlot === "notte") {
    // Per la notte, la fine è alle 6 del giorno successivo
    endDate.setDate(endDate.getDate() + 1)
  }
  endDate.setHours(endHour, 0, 0, 0)

  return {
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  }
}

// Funzione di utilità per estrarre la fascia oraria da un timestamp
async function getTimeSlotFromDateTime(dateTimeStr: string): Promise<string> {
  const date = new Date(dateTimeStr)
  const hours = date.getHours()

  if (hours >= 6 && hours < 12) {
    return "mattina"
  } else if (hours >= 12 && hours < 18) {
    return "pomeriggio"
  } else if (hours >= 18 && hours < 22) {
    return "sera"
  } else {
    return "notte"
  }
}

// Aggiungi una funzione di utilità per determinare se una todolist è scaduta
export async function isTodolistOverdue(date: string, timeSlot: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0]
  const currentHour = new Date().getHours()

  // Determina la fascia oraria corrente
  let currentTimeSlot = ""
  if (currentHour >= 6 && currentHour < 12) {
    currentTimeSlot = "mattina"
  } else if (currentHour >= 12 && currentHour < 18) {
    currentTimeSlot = "pomeriggio"
  } else if (currentHour >= 18 && currentHour < 22) {
    currentTimeSlot = "sera"
  } else {
    currentTimeSlot = "notte"
  }

  // Mappa delle fasce orarie per determinare l'ordine
  const timeSlotOrder = {
    mattina: 1,
    pomeriggio: 2,
    sera: 3,
    notte: 4,
  }

  return (
    new Date(date) < new Date(today) || (date === today && timeSlotOrder[timeSlot] < timeSlotOrder[currentTimeSlot])
  )
}
