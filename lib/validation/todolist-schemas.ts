import { z } from "zod";

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
export type CreateTodolistParams = z.infer<typeof CreateTodolistSchema>;

// Type per gli slot temporali
export type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte";

// Costante per l'ordine degli slot
export const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
};

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
  return "notte"
}

// Utility per ottenere il range temporale da una data e uno slot
export function getTimeRangeFromSlot(date: string, timeSlot: TimeSlot): { startTime: string; endTime: string } {
  const baseDate = new Date(date)
  let startHour = 0
  let endHour = 23

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
  }

  const startTime = new Date(baseDate)
  startTime.setHours(startHour, 0, 0, 0)

  const endTime = new Date(baseDate)
  if (timeSlot === "notte") {
    endTime.setDate(endTime.getDate() + 1)
  }
  endTime.setHours(endHour, 59, 59, 999)

  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  }
} 