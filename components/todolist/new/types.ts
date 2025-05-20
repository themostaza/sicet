import { Tables } from "@/supabase/database.types"

// Estensione dei tipi dal database
export type DbDevice = Tables<"devices">
export type DbKpi = Tables<"kpis">
export type DbTask = Tables<"tasks">

// TimeSlot
export type TimeSlot = "mattina" | "pomeriggio" | "giornata" | "sera" | "notte"

// Interfacce semplificate per l'uso nell'UI
export interface Device {
  id: string
  nome: string // corrisponde a name nel DB
  posizione?: string | null // corrisponde a location nel DB
  tags?: string[] | null
  // altri campi dal database potrebbero essere aggiunti se necessari
}

export interface KPI {
  id: string
  nome: string // corrisponde a name nel DB
  descrizione?: string | null // corrisponde a description nel DB
  value?: any
}

export interface DateTimeEntry {
  date: Date 
  time: string
  timeSlot: TimeSlot
}

export interface ValidationErrors {
  devices?: string
  dates?: string
  kpis?: string
}

// Utility per mappare i tipi del database ai tipi UI
export const mapDbDeviceToDevice = (dbDevice: DbDevice): Device => ({
  id: dbDevice.id,
  nome: dbDevice.name,
  posizione: dbDevice.location,
  tags: dbDevice.tags
})

export const mapDbKpiToKpi = (dbKpi: DbKpi): KPI => ({
  id: dbKpi.id,
  nome: dbKpi.name,
  descrizione: dbKpi.description,
  value: dbKpi.value
})

// Mappare la fascia oraria al formato per il database
export const timeSlotToScheduledTime = (date: Date, timeSlot: TimeSlot): string => {
  const dateStr = date.toISOString().split('T')[0]
  
  // Questo è solo un esempio, adatta in base alle tue esigenze
  switch (timeSlot) {
    case "mattina":
      return `${dateStr}T08:00:00`
    case "pomeriggio":
      return `${dateStr}T14:00:00`
    case "giornata":
      return `${dateStr}T09:00:00`
    case "sera":
      return `${dateStr}T18:00:00`
    case "notte":
      return `${dateStr}T22:00:00`
    default:
      return `${dateStr}T12:00:00`
  }
}