import { Tables } from "@/supabase/database.types"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot } from "@/lib/validation/todolist-schemas"

// Estensione dei tipi dal database
export type Device = Tables<"devices">
export type KPI = Tables<"kpis">

// Re-export types from validation schemas
export type { TimeSlot, TimeSlotValue, CustomTimeSlot }
export { isCustomTimeSlot }

// Interfacce semplificate per l'uso nell'UI
export interface DateTimeEntry {
  date: Date 
  time: string
  timeSlot: TimeSlotValue
}

export interface ValidationErrors {
  devices?: string
  dates?: string
  kpis?: string
}

// Utility per mappare i tipi del database ai tipi UI
export const mapDbDeviceToDevice = (dbDevice: Device): Device => ({
  ...dbDevice
})

export const mapDbKpiToKpi = (dbKpi: KPI): KPI => ({
  ...dbKpi
})

// Mappare la fascia oraria al formato per il database
export const timeSlotToScheduledTime = (date: Date, timeSlot: TimeSlotValue): string => {
  const dateStr = date.toISOString().split('T')[0]
  
  if (isCustomTimeSlot(timeSlot)) {
    // Per i timeslot personalizzati, usa l'ora e minuti di inizio
    const startHour = timeSlot.startHour.toString().padStart(2, '0')
    const startMinute = (timeSlot.startMinute || 0).toString().padStart(2, '0')
    return `${dateStr}T${startHour}:${startMinute}:00`
  }
  
  // Per i timeslot standard
  switch (timeSlot) {
    case "mattina":
      return `${dateStr}T06:00:00`
    case "pomeriggio":
      return `${dateStr}T14:00:00`
    case "notte":
      return `${dateStr}T22:00:00`
    case "giornata":
      return `${dateStr}T06:00:00`
    case "sera":
      return `${dateStr}T18:00:00`
    default:
      return `${dateStr}T06:00:00`
  }
}