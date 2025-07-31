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

// Costante per la tolleranza degli slot temporali (in ore)
export const TIME_SLOT_TOLERANCE = 3

// Costanti per gli intervalli orari degli slot temporali
export const TIME_SLOT_INTERVALS = {
  mattina: { start: 6, end: 14 },
  pomeriggio: { start: 14, end: 22 },
  notte: { start: 22, end: 6 },
  giornata: { start: 7, end: 17 },
} as const

// Type per gli slot temporali
export type TimeSlot = "mattina" | "pomeriggio" | "notte" | "giornata" | "custom"

// Interfaccia per i timeslot personalizzati
export interface CustomTimeSlot {
  type: "custom"
  startHour: number
  endHour: number
  startMinute?: number
  endMinute?: number
}

// Type union per tutti i possibili tipi di timeslot
export type TimeSlotValue = TimeSlot | CustomTimeSlot | string

// Costante per l'ordine degli slot
export const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  notte: 3,
  giornata: 4,
  custom: 5,
}

// Utility per convertire ore e minuti in minuti totali della giornata
export function timeToMinutes(hour: number, minute: number = 0): number {
  return hour * 60 + minute
}

// Utility per convertire minuti totali in ore e minuti
export function minutesToTime(minutes: number): { hour: number, minute: number } {
  return {
    hour: Math.floor(minutes / 60),
    minute: minutes % 60
  }
}

// Utility per verificare se un timeslot è personalizzato
export function isCustomTimeSlot(timeSlot: TimeSlotValue): timeSlot is CustomTimeSlot {
  return typeof timeSlot === "object" && timeSlot.type === "custom"
}

// Utility per verificare se una stringa rappresenta un timeslot personalizzato
export function isCustomTimeSlotString(timeSlot: string): boolean {
  return timeSlot.startsWith("custom_")
}

// Utility per convertire una stringa timeslot personalizzato in oggetto CustomTimeSlot
export function parseCustomTimeSlotString(timeSlot: string): CustomTimeSlot | null {
  if (!isCustomTimeSlotString(timeSlot)) return null
  
  const parts = timeSlot.split("_")
  if (parts.length !== 3) return null
  
  const startMinutes = parseInt(parts[1])
  const endMinutes = parseInt(parts[2])
  
  if (isNaN(startMinutes) || isNaN(endMinutes) || startMinutes < 0 || startMinutes > 1439 || endMinutes < 0 || endMinutes > 1439) {
    return null
  }
  
  const startTime = minutesToTime(startMinutes)
  const endTime = minutesToTime(endMinutes)
  
  return {
    type: "custom",
    startHour: startTime.hour,
    endHour: endTime.hour,
    startMinute: startTime.minute,
    endMinute: endTime.minute
  }
}

// Utility per convertire un CustomTimeSlot in stringa
export function customTimeSlotToString(timeSlot: CustomTimeSlot): string {
  const startMinutes = timeToMinutes(timeSlot.startHour, timeSlot.startMinute || 0)
  const endMinutes = timeToMinutes(timeSlot.endHour, timeSlot.endMinute || 0)
  return `custom_${startMinutes}_${endMinutes}`
}





// Utility per ottenere i valori del database per un time slot
export function getTimeSlotDatabaseValues(timeSlot: TimeSlotValue): { 
  type: "standard" | "custom", 
  start?: number, 
  end?: number 
} {
  if (isCustomTimeSlot(timeSlot)) {
    return {
      type: "custom",
      start: timeToMinutes(timeSlot.startHour, timeSlot.startMinute || 0),
      end: timeToMinutes(timeSlot.endHour, timeSlot.endMinute || 0)
    }
  }
  
  if (typeof timeSlot === "string") {
    if (isCustomTimeSlotString(timeSlot)) {
      const parsed = parseCustomTimeSlotString(timeSlot)
      if (parsed) {
        return {
          type: "custom",
          start: timeToMinutes(parsed.startHour, parsed.startMinute || 0),
          end: timeToMinutes(parsed.endHour, parsed.endMinute || 0)
        }
      }
    }
    
    // Standard time slot
    const interval = TIME_SLOT_INTERVALS[timeSlot as keyof typeof TIME_SLOT_INTERVALS]
    if (!interval) {
      throw new Error(`Invalid time slot: ${timeSlot}`)
    }
    return {
      type: "standard",
      start: timeToMinutes(interval.start, 0),
      end: timeToMinutes(interval.end, 0)
    }
  }
  
  throw new Error(`Invalid time slot value: ${timeSlot}`)
}

// Utility per ottenere il range temporale da una data e uno slot
export function getTimeRangeFromSlot(
  date: string, 
  timeSlot: TimeSlotValue | string,
  isFromDatabase: boolean = false
): { startTime: string; endTime: string } {
  const baseDate = new Date(date)
  let startHour = 0
  let startMinute = 0
  let endHour = 23
  let endMinute = 59

  // Get time slot values
  let customSlot: CustomTimeSlot
  
  if (typeof timeSlot === "string" && isCustomTimeSlotString(timeSlot)) {
    const parsed = parseCustomTimeSlotString(timeSlot)
    if (!parsed) throw new Error(`Invalid custom time slot string: ${timeSlot}`)
    customSlot = parsed
  } else if (isCustomTimeSlot(timeSlot)) {
    customSlot = timeSlot
  } else {
    // Standard time slot - get interval directly
    const interval = TIME_SLOT_INTERVALS[timeSlot as keyof typeof TIME_SLOT_INTERVALS]
    if (!interval) {
      throw new Error(`Invalid time slot: ${timeSlot}`)
    }
    customSlot = {
      type: "custom",
      startHour: interval.start,
      startMinute: 0,
      endHour: interval.end,
      endMinute: 0
    }
  }
  
  // Extract start and end times
  if (isFromDatabase) {
    // Se i valori vengono dal database, sono già in minuti
    const startTime = minutesToTime(customSlot.startHour) // startHour contiene i minuti dal DB
    const endTime = minutesToTime(customSlot.endHour) // endHour contiene i minuti dal DB
    startHour = startTime.hour
    startMinute = startTime.minute
    endHour = endTime.hour
    endMinute = endTime.minute
  } else {
    // Se i valori vengono dall'UI, sono ore e minuti
    startHour = customSlot.startHour
    startMinute = customSlot.startMinute || 0
    endHour = customSlot.endHour
    endMinute = customSlot.endMinute || 0
  }

  const startTime = new Date(baseDate)
  startTime.setHours(startHour, startMinute, 0, 0)

  const endTime = new Date(baseDate)
  if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
    endTime.setDate(endTime.getDate() + 1)
  }
  endTime.setHours(endHour, endMinute, 59, 999)

  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  }
}

// Utility per formattare un timeslot per la visualizzazione
export function formatTimeSlotValue(timeSlot: TimeSlotValue): string {
  // Handle standard time slots
  if (typeof timeSlot === "string" && timeSlot in TIME_SLOT_INTERVALS) {
    const interval = TIME_SLOT_INTERVALS[timeSlot as keyof typeof TIME_SLOT_INTERVALS]
    const startStr = interval.start.toString().padStart(2, '0')
    const endStr = interval.end.toString().padStart(2, '0')
    const endWithTolerance = interval.end + TIME_SLOT_TOLERANCE
    const endToleranceStr = (endWithTolerance >= 24 ? endWithTolerance - 24 : endWithTolerance).toString().padStart(2, '0')

    const timeSlotNames: Record<TimeSlot, string> = {
      mattina: "Mattina",
      pomeriggio: "Pomeriggio",
      notte: "Notte",
      giornata: "Giornata",
      custom: "Personalizzato"
    }

    return `${timeSlotNames[timeSlot as TimeSlot]} (${startStr}:00-${endStr}:00, scade alle ${endToleranceStr}:00)`
  }
  
  // Handle custom time slots
  let customSlot: CustomTimeSlot
  
  if (isCustomTimeSlot(timeSlot)) {
    customSlot = timeSlot
  } else if (typeof timeSlot === "string" && isCustomTimeSlotString(timeSlot)) {
    const parsed = parseCustomTimeSlotString(timeSlot)
    if (!parsed) return String(timeSlot)
    customSlot = parsed
  } else {
    return String(timeSlot)
  }
  
  const startStr = `${customSlot.startHour.toString().padStart(2, '0')}:${(customSlot.startMinute || 0).toString().padStart(2, '0')}`
  const endStr = `${customSlot.endHour.toString().padStart(2, '0')}:${(customSlot.endMinute || 0).toString().padStart(2, '0')}`
  
  // Calculate deadline with tolerance
  const endMinutes = timeToMinutes(customSlot.endHour, customSlot.endMinute || 0)
  const deadlineMinutes = endMinutes + (TIME_SLOT_TOLERANCE * 60)
  const deadlineTime = minutesToTime(deadlineMinutes)
  const deadlineStr = `${deadlineTime.hour.toString().padStart(2, '0')}:${deadlineTime.minute.toString().padStart(2, '0')}`
  
  return `Personalizzato (${startStr}-${endStr}, scade alle ${deadlineStr})`
}

// Get the current time slot based on the current time
export function getCurrentTimeSlot(date: Date): TimeSlot {
  const hour = date.getHours();
  
  // Gestiamo "giornata" come un time slot speciale che ha priorità
  // quando l'ora è nel suo range specifico (7-17)
  if (hour >= 7 && hour < 17) {
    return "giornata";
  } else if (hour >= 6 && hour < 14) {
    return "mattina";
  } else if (hour >= 14 && hour < 22) {
    return "pomeriggio";
  } else if (hour >= 22 || hour < 6) {
    return "notte";
  } else {
    return "mattina"; // Fallback to mattina if somehow we get here
  }
}

// Utility per fascia oraria (sincrona)
export function getTimeSlotFromDateTime(dateTimeStr: string): TimeSlot {
  const date = new Date(dateTimeStr)
  const hours = date.getHours()
  
  // Gestiamo "giornata" come un time slot speciale che ha priorità
  // quando l'ora è nel suo range specifico (7-17)
  if (hours >= 7 && hours < 17) return "giornata"
  
  // Per le altre ore, usiamo la logica standard
  if (hours >= 6 && hours < 14) return "mattina"
  if (hours >= 14 && hours < 22) return "pomeriggio"
  if (hours >= 22 || hours < 6) return "notte"
  return "mattina" // fallback
}

// Utility per verificare se una todolist è scaduta
export function isTodolistExpired(scheduledExecution: string, timeSlotType?: "standard" | "custom", timeSlotEnd?: number | null, timeSlotStart?: number | null): boolean {
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Rome"}))
  const scheduledDate = new Date(scheduledExecution)
  
  if (timeSlotEnd !== null && timeSlotEnd !== undefined) {
    // Use explicit end time from database
    const endTime = minutesToTime(timeSlotEnd)
    const startTime = timeSlotStart !== undefined && timeSlotStart !== null ? minutesToTime(timeSlotStart) : null
    let deadline = new Date(scheduledDate)

    // Add tolerance hours but keep the exact minutes
    let deadlineHour = endTime.hour + TIME_SLOT_TOLERANCE
    let deadlineDayOffset = 0

    // Se lo slot attraversa la mezzanotte (es. notte: 22-6), la deadline è il giorno dopo
    if (startTime && timeSlotStart !== null && timeSlotStart !== undefined && (timeSlotEnd <= timeSlotStart)) {
      deadlineDayOffset = 1
    }
    deadline.setDate(deadline.getDate() + deadlineDayOffset)
    
    if (deadlineHour >= 24) {
      deadline.setDate(deadline.getDate() + 1)
      deadlineHour = deadlineHour - 24
    }
    deadline.setHours(deadlineHour, endTime.minute, 0, 0)
    
    return now > deadline
  } else {
    // Fallback for old data - reconstruct from scheduled_execution
    const toleranceDate = new Date(scheduledDate)
    toleranceDate.setHours(toleranceDate.getHours() + TIME_SLOT_TOLERANCE)
    return now > toleranceDate
  }
}

// NEW FUNCTIONS - Nuove funzioni per la gestione delle todolist valide (senza modificare le esistenti)

// Utility per verificare se una todolist è attualmente valida (non scaduta, già iniziata)
// Usa orari CET e considera time_slot_start/end senza tolleranza per l'utente
export function isTodolistCurrentlyValid(
  scheduledExecution: string, 
  timeSlotStart: number | null, 
  timeSlotEnd: number | null,
  status?: string
): boolean {
  if (status === "completed") return false;
  
  // Usa orario italiano invece dell'orario server
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  const scheduledDate = new Date(scheduledExecution);
  
  // Usa solo la parte data di scheduledExecution (ignora l'orario)
  const baseDate = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
  
  if (timeSlotStart !== null && timeSlotEnd !== null) {
    // Calcola orario di inizio: data + time_slot_start minuti
    const startTime = new Date(baseDate);
    startTime.setMinutes(startTime.getMinutes() + timeSlotStart);
    
    // Calcola orario di fine: data + time_slot_end minuti (SENZA tolleranza per l'utente)
    // Ma con tolleranza per il sistema (per non nascondere durante periodo di grazia)
    const endTime = new Date(baseDate);
    const endMinutes = timeSlotEnd + (TIME_SLOT_TOLERANCE * 60); // + 3 ore di tolleranza
    endTime.setMinutes(endTime.getMinutes() + endMinutes);
    
    // Gestisci overnight slots (quando end < start, es. notte 22-06)
    if (timeSlotEnd <= timeSlotStart) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    // La todolist è valida se: già iniziata E non scaduta (con tolleranza sistema)
    return now >= startTime && now <= endTime;
  }
  
  return false;
}

// Utility per calcolare l'orario di deadline da mostrare all'utente (SENZA tolleranza)
export function getTodolistDeadlineDisplay(scheduledExecution: string, timeSlotEnd: number | null): Date | null {
  if (timeSlotEnd === null) return null;
  
  const scheduledDate = new Date(scheduledExecution);
  // Usa solo la parte data di scheduledExecution (ignora l'orario)
  const baseDate = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
  
  const deadline = new Date(baseDate);
  deadline.setMinutes(deadline.getMinutes() + timeSlotEnd);
  
  return deadline;
}

// Utility per verificare se una todolist è in periodo di grazia (badge "In scadenza")
export function isTodolistInGracePeriod(
  scheduledExecution: string, 
  timeSlotStart: number | null,
  timeSlotEnd: number | null,
  status?: string
): boolean {
  if (status === "completed") return false;
  
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  const scheduledDate = new Date(scheduledExecution);
  const baseDate = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
  
  if (timeSlotStart !== null && timeSlotEnd !== null) {
    // Orario di fine reale (senza tolleranza)
    const realEndTime = new Date(baseDate);
    realEndTime.setMinutes(realEndTime.getMinutes() + timeSlotEnd);
    
    // Orario di fine con tolleranza (sistema)
    const endTimeWithTolerance = new Date(baseDate);
    const endMinutes = timeSlotEnd + (TIME_SLOT_TOLERANCE * 60); // + 3 ore
    endTimeWithTolerance.setMinutes(endTimeWithTolerance.getMinutes() + endMinutes);
    
    // Gestisci overnight slots
    if (timeSlotEnd <= timeSlotStart) {
      realEndTime.setDate(realEndTime.getDate() + 1);
      endTimeWithTolerance.setDate(endTimeWithTolerance.getDate() + 1);
    }
    
    // In periodo di grazia se: scaduto l'orario reale MA ancora nel periodo di tolleranza
    return now > realEndTime && now <= endTimeWithTolerance;
  }
  
  return false;
}

// Helper functions for converting database rows to types
export const toTask = (row: {
  id: string
  todolist_id: string
  kpi_id: string
  status: string
  value: any
  created_at: string | null
  alert_checked: boolean | null
  updated_at: string | null
}) => ({
  id: row.id,
  todolist_id: row.todolist_id,
  kpi_id: row.kpi_id,
  status: row.status as "pending" | "in_progress" | "completed",
  value: row.value,
  created_at: row.created_at ?? undefined,
  updated_at: row.updated_at ?? row.created_at ?? undefined,
  alert_checked: row.alert_checked ?? false
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
  updated_at: row.updated_at ?? row.created_at ?? undefined
})

// // ================================
// // V2 SYSTEM - TIMESTAMP BASED
// // ================================

// // Definizioni degli orari standard per riconoscimento
// const STANDARD_TIME_SLOTS = {
//   mattina: { startHour: 6, startMinute: 0, endHour: 14, endMinute: 0 },
//   pomeriggio: { startHour: 14, startMinute: 0, endHour: 22, endMinute: 0 },
//   notte: { startHour: 22, startMinute: 0, endHour: 6, endMinute: 0 }, // cross-day
//   giornata: { startHour: 7, startMinute: 0, endHour: 17, endMinute: 0 }
// } as const

// // Utility per riconoscere il tipo di time slot dai timestamp del database
// export function recognizeTimeSlotFromTimestamps(
//   timeStartTmz: string | null, 
//   timeEndTmz: string | null
// ): TimeSlot | "custom" {
//   if (!timeStartTmz || !timeEndTmz) return "custom"
  
//   const startTime = new Date(timeStartTmz)
//   const endTime = new Date(timeEndTmz)
  
//   const startHour = startTime.getHours()
//   const startMinute = startTime.getMinutes()
//   const endHour = endTime.getHours()
//   const endMinute = endTime.getMinutes()
  
//   // Verifica se è cross-day (notte)
//   const isCrossDay = endTime.getDate() !== startTime.getDate()
  
//   // Controlla ogni slot standard
//   for (const [slotName, slot] of Object.entries(STANDARD_TIME_SLOTS)) {
//     const matchesStart = slot.startHour === startHour && slot.startMinute === startMinute
//     const matchesEnd = slot.endHour === endHour && slot.endMinute === endMinute
    
//     // Per la notte, deve essere cross-day
//     if (slotName === "notte") {
//       if (matchesStart && matchesEnd && isCrossDay) {
//         return "notte" as TimeSlot
//       }
//     } else {
//       // Per gli altri slot, deve essere same-day
//       if (matchesStart && matchesEnd && !isCrossDay) {
//         return slotName as TimeSlot
//       }
//     }
//   }
  
//   // Se non corrisponde a nessuno slot standard, è custom
//   return "custom"
// }

// // Schema per Todolist V2 (timestamp-based)
// export const TodolistSchemaV2 = z.object({
//   id: z.string({ message: "ID non valido" }),
//   device_id: z.string({ message: "ID dispositivo non valido" }),
//   scheduled_execution: z.string({ message: "Data di esecuzione non valida" }),
//   status: z.enum(["pending", "in_progress", "completed"], { message: "Stato non valido" }),
//   created_at: z.string().optional().nullable(),
//   updated_at: z.string().optional().nullable(),
//   completion_date: z.string().optional().nullable(),
//   time_slot_type: z.enum(["standard", "custom"], { message: "Tipo time slot non valido" }),
//   time_start_tmz: z.string().nullable(), // timestamp ISO string with timezone
//   time_end_tmz: z.string().nullable(),   // timestamp ISO string with timezone
//   completed_by: z.string().optional().nullable(),
//   end_day_time: z.string().optional().nullable(),
//   todolist_category: z.string().optional().nullable()
// });

// // Schema per i parametri di una todolist V2
// export const TodolistParamsSchemaV2 = z.object({
//   deviceId: z.string({ message: "ID dispositivo richiesto" }),
//   date: z.string({ message: "Data richiesta" }),
//   timeSlot: z.string({ message: "Fascia oraria richiesta" }),
//   offset: z.number().optional().default(0),
//   limit: z.number().optional().default(20)
// });

// // Schema per creazione todolist V2
// export const CreateTodolistSchemaV2 = z.object({
//   deviceId: z.string({ message: "ID dispositivo richiesto" }),
//   date: z.string({ message: "Data richiesta" }),
//   timeSlot: z.string({ message: "Fascia oraria richiesta" }),
//   kpiIds: z.array(z.string()).min(1, { message: "Seleziona almeno un KPI" }),
//   // Per custom time slots
//   customStartTime: z.string().optional(), // ISO timestamp
//   customEndTime: z.string().optional(),   // ISO timestamp
// });

// // Types V2
// export type TodolistV2 = z.infer<typeof TodolistSchemaV2>;
// export type TodolistParamsV2 = z.infer<typeof TodolistParamsSchemaV2>;
// export type CreateTodolistParamsV2 = z.infer<typeof CreateTodolistSchemaV2>;

// // Interface per i custom time slot con timestamp
// export interface CustomTimeSlotTmz {
//   type: "custom"
//   startTime: string // ISO timestamp with timezone
//   endTime: string   // ISO timestamp with timezone
// }

// // Type union per tutti i possibili tipi di timeslot V2
// export type TimeSlotValueV2 = TimeSlot | CustomTimeSlotTmz | string

// // Utility per verificare se un timeslot V2 è personalizzato
// export function isCustomTimeSlotTmz(timeSlot: TimeSlotValueV2): timeSlot is CustomTimeSlotTmz {
//   return typeof timeSlot === "object" && timeSlot.type === "custom" && "startTime" in timeSlot && "endTime" in timeSlot
// }

// // Utility per creare timestamp con timezone italiano per una data e orario specifici
// export function createItalianTimestamp(baseDate: string, hour: number, minute: number = 0): string {
//   const date = new Date(baseDate)
//   // Crea il timestamp nel timezone italiano
//   const italianDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0)
  
//   // Converti in timezone italiano (Europe/Rome)
//   const formatter = new Intl.DateTimeFormat('sv-SE', {
//     timeZone: 'Europe/Rome',
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit',
//     second: '2-digit'
//   });
  
//   const parts = formatter.formatToParts(italianDate);
//   const year = parts.find(p => p.type === 'year')?.value;
//   const month = parts.find(p => p.type === 'month')?.value;
//   const day = parts.find(p => p.type === 'day')?.value;
//   const hourPart = parts.find(p => p.type === 'hour')?.value;
//   const minutePart = parts.find(p => p.type === 'minute')?.value;
//   const second = parts.find(p => p.type === 'second')?.value;
  
//   // Costruisci l'ISO string con timezone
//   const isoString = `${year}-${month}-${day}T${hourPart}:${minutePart}:${second}+01:00`;
//   return isoString;
// }

// // Utility per ottenere i timestamp di inizio e fine per un time slot V2
// export function getTimeSlotTimestampsV2(
//   baseDate: string,
//   timeSlot: TimeSlotValueV2
// ): { startTime: string; endTime: string } {
  
//   // Handle custom time slot
//   if (isCustomTimeSlotTmz(timeSlot)) {
//     return {
//       startTime: timeSlot.startTime,
//       endTime: timeSlot.endTime
//     }
//   }
  
//   // Handle standard time slots usando le definizioni
//   if (typeof timeSlot === "string" && timeSlot in STANDARD_TIME_SLOTS) {
//     const slot = STANDARD_TIME_SLOTS[timeSlot as keyof typeof STANDARD_TIME_SLOTS]
    
//     const startTime = createItalianTimestamp(baseDate, slot.startHour, slot.startMinute)
//     let endTime: string
    
//     // Per la notte, l'end time è il giorno successivo
//     if (timeSlot === "notte") {
//       const nextDay = new Date(baseDate)
//       nextDay.setDate(nextDay.getDate() + 1)
//       endTime = createItalianTimestamp(nextDay.toISOString().split('T')[0], slot.endHour, slot.endMinute)
//     } else {
//       endTime = createItalianTimestamp(baseDate, slot.endHour, slot.endMinute)
//     }
    
//     return { startTime, endTime }
//   }
  
//   throw new Error(`Invalid time slot V2: ${timeSlot}`)
// }

// // Utility per verificare se una todolist V2 è scaduta
// export function isTodolistExpiredV2(
//   timeEndTmz: string | null,
//   status?: string
// ): boolean {
//   if (status === "completed" || !timeEndTmz) return false;
  
//   const now = new Date();
//   const endTime = new Date(timeEndTmz);
  
//   // Aggiungi tolleranza (3 ore)
//   const endTimeWithTolerance = new Date(endTime);
//   endTimeWithTolerance.setHours(endTimeWithTolerance.getHours() + TIME_SLOT_TOLERANCE);
  
//   return now > endTimeWithTolerance;
// }

// // Utility per verificare se una todolist V2 è attualmente valida
// export function isTodolistCurrentlyValidV2(
//   timeStartTmz: string | null,
//   timeEndTmz: string | null,
//   status?: string
// ): boolean {
//   if (status === "completed" || !timeStartTmz || !timeEndTmz) return false;
  
//   const now = new Date();
//   const startTime = new Date(timeStartTmz);
//   const endTime = new Date(timeEndTmz);
  
//   // Aggiungi tolleranza per il sistema (3 ore)
//   const endTimeWithTolerance = new Date(endTime);
//   endTimeWithTolerance.setHours(endTimeWithTolerance.getHours() + TIME_SLOT_TOLERANCE);
  
//   // La todolist è valida se: già iniziata E non scaduta (con tolleranza)
//   return now >= startTime && now <= endTimeWithTolerance;
// }

// // Utility per verificare se una todolist V2 è in periodo di grazia
// export function isTodolistInGracePeriodV2(
//   timeStartTmz: string | null,
//   timeEndTmz: string | null,
//   status?: string
// ): boolean {
//   if (status === "completed" || !timeStartTmz || !timeEndTmz) return false;
  
//   const now = new Date();
//   const startTime = new Date(timeStartTmz);
//   const endTime = new Date(timeEndTmz);
  
//   // Orario di fine con tolleranza
//   const endTimeWithTolerance = new Date(endTime);
//   endTimeWithTolerance.setHours(endTimeWithTolerance.getHours() + TIME_SLOT_TOLERANCE);
  
//   // In periodo di grazia se: scaduto l'orario reale MA ancora nel periodo di tolleranza
//   return now > endTime && now <= endTimeWithTolerance;
// }

// // Utility per ottenere il time slot corrente V2 basato su timestamp
// export function getCurrentTimeSlotV2(now: Date = new Date()): TimeSlot {
//   // Converti in orario italiano
//   const italianTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
//   const hour = italianTime.getHours();
  
//   // Stessa logica del sistema V1 ma con awareness del timezone
//   if (hour >= 7 && hour < 17) {
//     return "giornata";
//   } else if (hour >= 6 && hour < 14) {
//     return "mattina";
//   } else if (hour >= 14 && hour < 22) {
//     return "pomeriggio";
//   } else if (hour >= 22 || hour < 6) {
//     return "notte";
//   } else {
//     return "mattina"; // Fallback
//   }
// }

// // Utility per formattare un timeslot V2 per la visualizzazione
// export function formatTimeSlotValueV2(timeSlot: TimeSlotValueV2): string {
//   // Handle standard time slots - diretto e semplice
//   if (typeof timeSlot === "string") {
//     const timeSlotNames: Record<TimeSlot, string> = {
//       mattina: "Mattina",
//       pomeriggio: "Pomeriggio", 
//       notte: "Notte",
//       giornata: "Giornata",
//       custom: "Personalizzato"
//     }
    
//     const definitions: Record<TimeSlot, { display: string; toleranceDisplay: string }> = {
//       mattina: { 
//         display: "6:00-14:00", 
//         toleranceDisplay: "17:00" // 14:00 + 3 ore
//       },
//       pomeriggio: { 
//         display: "14:00-22:00", 
//         toleranceDisplay: "01:00" // 22:00 + 3 ore = 01:00 del giorno dopo
//       },
//       notte: { 
//         display: "22:00-06:00", 
//         toleranceDisplay: "09:00" // 06:00 + 3 ore = 09:00
//       },
//       giornata: { 
//         display: "7:00-17:00", 
//         toleranceDisplay: "20:00" // 17:00 + 3 ore
//       },
//       custom: { 
//         display: "personalizzato", 
//         toleranceDisplay: "variabile" 
//       }
//     }
    
//     const def = definitions[timeSlot as TimeSlot]
//     if (def) {
//       return `${timeSlotNames[timeSlot as TimeSlot]} (${def.display}, scade alle ${def.toleranceDisplay})`
//     }
//   }
  
//   // Handle custom time slot
//   if (isCustomTimeSlotTmz(timeSlot)) {
//     const startTime = new Date(timeSlot.startTime)
//     const endTime = new Date(timeSlot.endTime)
    
//     const startStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
//     const endStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
    
//     // Calculate deadline with tolerance
//     const deadlineTime = new Date(endTime)
//     deadlineTime.setHours(deadlineTime.getHours() + TIME_SLOT_TOLERANCE)
//     const deadlineStr = `${deadlineTime.getHours().toString().padStart(2, '0')}:${deadlineTime.getMinutes().toString().padStart(2, '0')}`
    
//     return `Personalizzato (${startStr}-${endStr}, scade alle ${deadlineStr})`
//   }
  
//   return String(timeSlot)
// }

// // Helper function for converting database rows to TodolistV2 type
// export const toTodolistV2 = (row: {
//   id: string
//   device_id: string
//   scheduled_execution: string
//   status: "pending" | "in_progress" | "completed"
//   created_at: string | null
//   updated_at: string | null
//   completion_date: string | null
//   time_slot_type: "standard" | "custom"
//   time_start_tmz: string | null
//   time_end_tmz: string | null
//   completed_by: string | null
//   end_day_time: string | null
//   todolist_category: string | null
// }) => ({
//   id: row.id,
//   device_id: row.device_id,
//   scheduled_execution: row.scheduled_execution,
//   status: row.status,
//   created_at: row.created_at ?? undefined,
//   updated_at: row.updated_at ?? row.created_at ?? undefined,
//   completion_date: row.completion_date ?? undefined,
//   time_slot_type: row.time_slot_type,
//   time_start_tmz: row.time_start_tmz,
//   time_end_tmz: row.time_end_tmz,
//   completed_by: row.completed_by ?? undefined,
//   end_day_time: row.end_day_time ?? undefined,
//   todolist_category: row.todolist_category ?? undefined
// })

 