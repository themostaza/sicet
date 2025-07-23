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
// scheduled_execution è sempre impostato a mezzanotte (00:00)
export const timeSlotToScheduledTime = (date: Date, timeSlot: TimeSlotValue): string => {
  const dateStr = date.toISOString().split('T')[0]
  return `${dateStr}T00:00:00`
}