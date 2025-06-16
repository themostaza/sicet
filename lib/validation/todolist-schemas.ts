import { z } from "zod";
import type { TablesInsert } from "@/supabase/database.types";

// Schema base per Todolist
export const TodolistSchema = z.object({
  id: z.string({ message: "ID non valido" }),
  device_id: z.string({ message: "ID dispositivo non valido" }),
  scheduled_execution: z.string({ message: "Data di esecuzione non valida" }),
  status: z.enum(["pending", "in_progress", "completed"], { message: "Stato non valido" }),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable()
});

// Schema base per Task
export const TaskSchema = z.object({
  id: z.string({ message: "ID non valido" }),
  todolist_id: z.string({ message: "ID todolist non valido" }),
  kpi_id: z.string({ message: "ID KPI non valido" }),
  status: z.string({ message: "Stato non valido" }),
  value: z.any().optional(),
  created_at: z.string().optional().nullable(),
  alert_checked: z.boolean().optional().default(false),
  updated_at: z.string().optional().nullable()
});

// Schema per i parametri di una todolist
export const TodolistParamsSchema = z.object({
  deviceId: z.string({ message: "ID dispositivo richiesto" }),
  date: z.string({ message: "Data richiesta" }),
  timeSlot: z.string({ message: "Fascia oraria richiesta" }),
  offset: z.number().optional().default(0),
  limit: z.number().optional().default(20)
});

// Schema per i parametri di una todolist con ID
export const TodolistIdParamsSchema = z.object({
  todolistId: z.string({ message: "ID todolist richiesto" }),
  offset: z.number().optional().default(0),
  limit: z.number().optional().default(20)
});

// Schema per creazione todolist
export const CreateTodolistSchema = z.object({
  deviceId: z.string({ message: "ID dispositivo richiesto" }),
  date: z.string({ message: "Data richiesta" }),
  timeSlot: z.string({ message: "Fascia oraria richiesta" }),
  kpiIds: z.array(z.string()).min(1, { message: "Seleziona almeno un KPI" }),
});

// Types
export type Todolist = z.infer<typeof TodolistSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TodolistParams = z.infer<typeof TodolistParamsSchema>;
export type TodolistIdParams = z.infer<typeof TodolistIdParamsSchema>;
export type CreateTodolistParams = z.infer<typeof CreateTodolistSchema>;

// Type per gli slot temporali
export type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte" | "giornata" | "custom"

// Interfaccia per i timeslot personalizzati
export interface CustomTimeSlot {
  type: "custom"
  startHour: number
  endHour: number
}

// Type union per tutti i possibili tipi di timeslot
export type TimeSlotValue = TimeSlot | CustomTimeSlot

// Costante per l'ordine degli slot
export const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
  giornata: 5,
  custom: 6,
}

// Utility per verificare se un timeslot è personalizzato
export function isCustomTimeSlot(timeSlot: TimeSlotValue): timeSlot is CustomTimeSlot {
  return typeof timeSlot === "object" && timeSlot.type === "custom"
}

// Utility per ottenere il range temporale da una data e uno slot
export function getTimeRangeFromSlot(date: string, timeSlot: TimeSlotValue): { startTime: string; endTime: string } {
  const baseDate = new Date(date)
  let startHour = 0
  let endHour = 23

  if (isCustomTimeSlot(timeSlot)) {
    startHour = timeSlot.startHour
    endHour = timeSlot.endHour
  } else {
    switch (timeSlot) {
      case "mattina":
        startHour = 6
        endHour = 11
        break
      case "pomeriggio":
        startHour = 12
        endHour = 17
        break
      case "sera":
        startHour = 18
        endHour = 21
        break
      case "notte":
        startHour = 22
        endHour = 5
        break
      case "giornata":
        startHour = 6
        endHour = 17
        break
      case "custom":
        // Questo caso non dovrebbe mai verificarsi poiché gestito sopra
        startHour = 0
        endHour = 23
        break
    }
  }

  const startTime = new Date(baseDate)
  startTime.setHours(startHour, 0, 0, 0)

  const endTime = new Date(baseDate)
  if (endHour < startHour) {
    endTime.setDate(endTime.getDate() + 1)
  }
  endTime.setHours(endHour, 59, 59, 999)

  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  }
}

// Utility per formattare un timeslot per la visualizzazione
export function formatTimeSlotValue(timeSlot: TimeSlotValue): string {
  if (isCustomTimeSlot(timeSlot)) {
    const startStr = timeSlot.startHour.toString().padStart(2, '0')
    const endStr = timeSlot.endHour.toString().padStart(2, '0')
    return `Personalizzato (${startStr}:00-${endStr}:00)`
  }

  switch (timeSlot) {
    case "mattina":
      return "Mattina (fino alle 14:00)"
    case "pomeriggio":
      return "Pomeriggio (fino alle 22:00)"
    case "sera":
      return "Sera (fino alle 22:00)"
    case "notte":
      return "Notte (fino alle 06:00)"
    case "giornata":
      return "Giornata (fino alle 20:00)"
    case "custom":
      return "Personalizzato"
    default:
      return String(timeSlot)
  }
}

// Get the current time slot based on the current time
export function getCurrentTimeSlot(date: Date): TimeSlot {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 14) {
    return "mattina";
  } else if (hour >= 14 && hour < 22) {
    return "pomeriggio";
  } else if (hour >= 22 || hour < 6) {
    return "notte";
  } else {
    return "sera"; // This should never happen due to the conditions above
  }
}

// Utility per fascia oraria (sincrona)
export function getTimeSlotFromDateTime(dateTimeStr: string): TimeSlot {
  const date = new Date(dateTimeStr)
  const hours = date.getHours()
  if (hours >= 6 && hours < 12) return "mattina"
  if (hours >= 12 && hours < 18) return "pomeriggio"
  if (hours >= 18 && hours < 22) return "sera"
  if (hours >= 6 && hours < 17) return "giornata"
  return "notte"
}

// Utility per verificare se una todolist è scaduta
export function isTodolistExpired(scheduledExecution: string, toleranceHours: number = 3): boolean {
  const now = new Date()
  const executionDate = new Date(scheduledExecution)
  const timeSlot = getTimeSlotFromDateTime(scheduledExecution)
  const { endTime } = getTimeRangeFromSlot(
    executionDate.toISOString().split('T')[0],
    timeSlot
  )
  
  // Aggiungi le ore di tolleranza alla fine del timeslot
  const expirationDate = new Date(endTime)
  expirationDate.setHours(expirationDate.getHours() + toleranceHours)
  
  return now > expirationDate
}

// Helper functions for converting database rows to types
export const toTask = (row: {
  id: string
  todolist_id: string
  kpi_id: string
  status: string
  value: any
  created_at: string | null
  alert_checked: boolean
  updated_at: string | null
}) => ({
  id: row.id,
  todolist_id: row.todolist_id,
  kpi_id: row.kpi_id,
  status: row.status as "pending" | "in_progress" | "completed",
  value: row.value,
  created_at: row.created_at ?? undefined,
  updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  alert_checked: row.alert_checked
})

export const toTodolist = (row: {
  id: string
  device_id: string
  scheduled_execution: string
  status: "pending" | "in_progress" | "completed"
  created_at: string | null
  updated_at: string | null
}) => ({
  id: row.id,
  device_id: row.device_id,
  scheduled_execution: row.scheduled_execution,
  status: row.status,
  created_at: row.created_at ?? undefined,
  updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString()
}) 