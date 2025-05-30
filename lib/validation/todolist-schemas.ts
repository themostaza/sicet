import { z } from "zod";

// Schema base per Task
export const TaskSchema = z.object({
  id: z.string({ message: "ID non valido" }),
  device_id: z.string({ message: "ID dispositivo non valido" }),
  kpi_id: z.string({ message: "ID KPI non valido" }),
  scheduled_execution: z.string({ message: "Data di esecuzione non valida" }),
  status: z.string({ message: "Stato non valido" }),
  value: z.any().optional(),
  completion_date: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
});

export type Task = z.infer<typeof TaskSchema>;

// Schema per i parametri della todolist
export const TodolistParamsSchema = z.object({
  deviceId: z.string(),
  date: z.string(),
  timeSlot: z.string(),
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
});

// Type per gli slot temporali
export type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte";

// Costante per l'ordine degli slot
export const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
};

// Schema per creazione todolist
export const CreateTodolistSchema = z.object({
  deviceId: z.string({ message: "ID dispositivo richiesto" }),
  date: z.string({ message: "Data richiesta" }),
  timeSlot: z.string({ message: "Fascia oraria richiesta" }),
  kpiIds: z.array(z.string()).min(1, { message: "Seleziona almeno un KPI" }),
});

export type TodolistParams = z.infer<typeof TodolistParamsSchema>;
export type CreateTodolistParams = z.infer<typeof CreateTodolistSchema>;

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