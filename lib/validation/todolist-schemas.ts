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

// Schema per i parametri di ricerca delle todolist
export const TodolistParamsSchema = z.object({
  deviceId: z.string({ message: "ID dispositivo richiesto" }),
  date: z.string({ message: "Data richiesta" }), // formato YYYY-MM-DD
  timeSlot: z.string({ message: "Fascia oraria richiesta" }),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Schema per creazione todolist
export const CreateTodolistSchema = z.object({
  deviceId: z.string({ message: "ID dispositivo richiesto" }),
  date: z.string({ message: "Data richiesta" }),
  timeSlot: z.string({ message: "Fascia oraria richiesta" }),
  kpiIds: z.array(z.string()).min(1, { message: "Seleziona almeno un KPI" }),
});

export type TodolistParams = z.infer<typeof TodolistParamsSchema>;
export type CreateTodolistParams = z.infer<typeof CreateTodolistSchema>; 