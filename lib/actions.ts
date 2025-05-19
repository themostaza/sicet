
"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createServerSupabaseClient } from "./supabase"
import type { Database } from "@/supabase/database.types"

const DeviceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  location: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
})
export type Device = z.infer<typeof DeviceSchema>

type DevicesRow = Database["public"]["Tables"]["devices"]["Row"]

const toDevice = (row: DevicesRow): Device => ({
  id: row.id,
  name: row.name,
  location: row.location ?? "",
  description: row.description ?? "",
  imageUrl: row.image_url ?? "",
  icon: row.icon ?? "",
  tags: row.tags ?? [],
})

const toRow = (d: Device): DevicesRow => ({
  id: d.id,
  name: d.name,
  location: d.location,
  description: d.description ?? null,
  type: null,
  image_url: d.imageUrl ?? null,
  icon: d.icon ?? null,
  tags: d.tags ?? [],
  model: null,
  qrcode_url: null,
  created_at: new Date().toISOString(),
})

export async function getDevices(): Promise<Device[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("devices").select("*").order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data.map(toDevice)
}

export async function getDevice(id: string): Promise<Device | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("devices").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toDevice(data) : null
}

export async function createDevice(d: Device): Promise<Device> {
  DeviceSchema.parse(d)
  const supabase = createServerSupabaseClient()
  const { data: existing } = await supabase.from("devices").select("id").eq("id", d.id).maybeSingle()
  if (existing) throw new Error("ID già in uso")

  const { data, error } = await supabase.from("devices").insert([toRow(d)]).select()
  if (error) throw new Error(error.message)

  revalidatePath("/devices")
  return toDevice(data![0])
}

export async function updateDevice(d: Device): Promise<Device> {
  DeviceSchema.parse(d)
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("devices").update(toRow(d)).eq("id", d.id).select()
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error("Device non trovato")
  revalidatePath("/devices")
  return toDevice(data[0])
}

export async function deleteDevice(id: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("devices").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/devices")
}
