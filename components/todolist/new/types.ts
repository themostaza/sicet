import { Tables } from "@/supabase/database.types"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot } from "@/lib/validation/todolist-schemas"

// Estensione dei tipi dal database
export type Device = Tables<"devices">
export type KPI = Tables<"kpis">

// Re-export types from validation schemas
export type { TimeSlot, TimeSlotValue, CustomTimeSlot }
export { isCustomTimeSlot }

// Tipi per la categoria todolist
export type TodolistCategory = string

// Regole per le combinazioni categoria-fascia oraria raccomandate
export const CATEGORY_TIME_SLOT_RULES: Record<string, TimeSlot[]> = {
  "caldaista": ["mattina", "giornata", "pomeriggio", "notte"],
  "manutentore": ["giornata"],
  "operatore al giro": ["mattina", "giornata", "pomeriggio", "notte"],
  "piazzale": ["mattina", "giornata", "pomeriggio"], 
  "ufficio": ["giornata"]
}

// Funzione per validare se una combinazione è raccomandata
export const isCategoryTimeSlotRecommended = (category: string, timeSlot: TimeSlot): boolean => {
  if (!category) return true // Nessuna categoria = sempre valido
  const recommendedSlots = CATEGORY_TIME_SLOT_RULES[category.toLowerCase()]
  return !recommendedSlots || recommendedSlots.includes(timeSlot)
}

// Interfacce semplificate per l'uso nell'UI
export interface DateTimeEntry {
  date: Date 
  time: string
  timeSlot: TimeSlotValue
  category?: TodolistCategory
}

export interface ValidationErrors {
  devices?: string
  dates?: string
  kpis?: string
  category?: string
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