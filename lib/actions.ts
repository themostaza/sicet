"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "./supabase"

// Tipo per i punti di controllo
interface PuntoControllo {
  id: string
  nome: string
  posizione: string
  descrizione?: string
  urlImmagine?: string
  icona?: string
  tags?: string[]
}

// Funzione per convertire un punto di controllo nel formato del database
function puntoControlloToDevice(punto: PuntoControllo) {
  return {
    id: punto.id,
    name: punto.nome,
    location: punto.posizione,
    description: punto.descrizione || null,
    type: null,
    image_url: punto.urlImmagine || null,
    icon: punto.icona || null,
    tags: punto.tags || [],
  }
}

// Funzione per convertire un record del database in un punto di controllo
function deviceToPuntoControllo(device: any): PuntoControllo {
  return {
    id: device.id,
    nome: device.name,
    posizione: device.location,
    descrizione: device.description || "",
    urlImmagine: device.image_url || "",
    icona: device.icon || "",
    tags: device.tags || [],
  }
}

// Ottieni tutti i punti di controllo
export async function getPuntiControllo(): Promise<PuntoControllo[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("devices").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Errore nel recupero dei punti di controllo:", error)
    throw new Error("Impossibile recuperare i punti di controllo")
  }

  return data.map(deviceToPuntoControllo)
}

// Ottieni un singolo punto di controllo per ID
export async function getPuntoControllo(id: string): Promise<PuntoControllo | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("devices").select("*").eq("id", id).single()

  if (error) {
    if (error.code === "PGRST116") {
      // Record non trovato
      return null
    }
    console.error("Errore nel recupero del punto di controllo:", error)
    throw new Error("Impossibile recuperare il punto di controllo")
  }

  return deviceToPuntoControllo(data)
}

// Crea un nuovo punto di controllo
export async function createPuntoControllo(punto: PuntoControllo): Promise<PuntoControllo> {
  const supabase = createServerSupabaseClient()

  // Verifica se l'ID è già in uso
  const { data: esistente } = await supabase.from("devices").select("id").eq("id", punto.id).single()

  if (esistente) {
    throw new Error("ID già in uso. Scegli un ID diverso.")
  }

  const device = puntoControlloToDevice(punto)

  const { data, error } = await supabase.from("devices").insert([device]).select()

  if (error) {
    console.error("Errore nella creazione del punto di controllo:", error)
    throw new Error("Impossibile creare il punto di controllo")
  }

  revalidatePath("/punti-di-controllo")
  return deviceToPuntoControllo(data[0])
}

// Aggiorna un punto di controllo esistente
export async function updatePuntoControllo(punto: PuntoControllo): Promise<PuntoControllo> {
  const supabase = createServerSupabaseClient()

  const device = puntoControlloToDevice(punto)

  const { data, error } = await supabase.from("devices").update(device).eq("id", punto.id).select()

  if (error) {
    console.error("Errore nell'aggiornamento del punto di controllo:", error)
    throw new Error("Impossibile aggiornare il punto di controllo")
  }

  if (!data || data.length === 0) {
    throw new Error("Punto di controllo non trovato")
  }

  revalidatePath("/punti-di-controllo")
  return deviceToPuntoControllo(data[0])
}

// Elimina un punto di controllo
export async function deletePuntoControllo(id: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("devices").delete().eq("id", id)

  if (error) {
    console.error("Errore nell'eliminazione del punto di controllo:", error)
    throw new Error("Impossibile eliminare il punto di controllo")
  }

  revalidatePath("/punti-di-controllo")
}
