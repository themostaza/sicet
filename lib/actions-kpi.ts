"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "./supabase"

// Tipo per i controlli (KPI)
interface Controllo {
  id: string
  nome: string
  descrizione?: string
  campi?: Campo[]
}

// Tipo per i campi personalizzati
interface Campo {
  nome: string
  tipo: string
  descrizione?: string
  obbligatorio: boolean
}

// Funzione per convertire un controllo nel formato del database
function controlloToKpi(controllo: Controllo) {
  return {
    id: controllo.id,
    name: controllo.nome,
    description: controllo.descrizione || null,
    value: controllo.campi ? { fields: controllo.campi } : { fields: [] },
  }
}

// Funzione per convertire un record del database in un controllo
function kpiToControllo(kpi: any): Controllo {
  return {
    id: kpi.id,
    nome: kpi.name,
    descrizione: kpi.description || "",
    campi: kpi.value?.fields || [],
  }
}

// Genera un ID univoco
function generateId() {
  return `kpi_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

// Ottieni tutti i controlli
export async function getControlli(): Promise<Controllo[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("kpis").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Errore nel recupero dei controlli:", error)
    throw new Error("Impossibile recuperare i controlli")
  }

  return data.map(kpiToControllo)
}

// Ottieni un singolo controllo per ID
export async function getControllo(id: string): Promise<Controllo | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("kpis").select("*").eq("id", id).single()

  if (error) {
    if (error.code === "PGRST116") {
      // Record non trovato
      return null
    }
    console.error("Errore nel recupero del controllo:", error)
    throw new Error("Impossibile recuperare il controllo")
  }

  return kpiToControllo(data)
}

// Crea un nuovo controllo
export async function createControllo(controllo: Omit<Controllo, "id">): Promise<Controllo> {
  const supabase = createServerSupabaseClient()

  // Genera un ID univoco
  const id = generateId()
  const nuovoControllo = { ...controllo, id }

  const kpi = controlloToKpi(nuovoControllo)

  const { data, error } = await supabase.from("kpis").insert([kpi]).select()

  if (error) {
    console.error("Errore nella creazione del controllo:", error)
    throw new Error("Impossibile creare il controllo")
  }

  revalidatePath("/controlli")
  return kpiToControllo(data[0])
}

// Aggiorna un controllo esistente
export async function updateControllo(controllo: Controllo): Promise<Controllo> {
  const supabase = createServerSupabaseClient()

  const kpi = controlloToKpi(controllo)

  const { data, error } = await supabase.from("kpis").update(kpi).eq("id", controllo.id).select()

  if (error) {
    console.error("Errore nell'aggiornamento del controllo:", error)
    throw new Error("Impossibile aggiornare il controllo")
  }

  if (!data || data.length === 0) {
    throw new Error("Controllo non trovato")
  }

  revalidatePath("/controlli")
  return kpiToControllo(data[0])
}

// Elimina un controllo
export async function deleteControllo(id: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("kpis").delete().eq("id", id)

  if (error) {
    console.error("Errore nell'eliminazione del controllo:", error)
    throw new Error("Impossibile eliminare il controllo")
  }

  revalidatePath("/controlli")
}
