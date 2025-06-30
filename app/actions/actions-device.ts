'use server'

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "../../lib/supabase-server";
import type { Database } from "@/supabase/database.types";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { 
  Device,
  DeviceInsertSchema, 
  DeviceUpdateSchema, 
  ListParamsSchema 
} from "@/lib/validation/device-schemas";
import { logCurrentUserActivity } from "./actions-activity";
import { generateDeviceId } from "@/lib/utils";

/** -------------------------------------------------------------------------
 * 1 · SUPABASE CLIENT TIPIZZATO
 * ------------------------------------------------------------------------*/

type DevicesTable = Database["public"]["Tables"]["devices"];
export type DevicesRow = DevicesTable["Row"];

type DevicesInsertRow = DevicesTable["Insert"];
type DevicesUpdateRow = DevicesTable["Update"];

const supabase = async (): Promise<SupabaseClient<Database>> =>
  await createServerSupabaseClient();

/** -------------------------------------------------------------------------
 * 2 · MAPPERS camelCase ⇆ snake_case
 * ------------------------------------------------------------------------*/

const toDevice = (row: DevicesRow): Device => ({
  id: row.id,
  name: row.name,
  location: row.location ?? "",
  description: row.description ?? "",
  tags: row.tags ?? [],
  model: row.model ?? undefined,
  type: row.type ?? undefined,
  qrcodeUrl: row.qrcode_url ?? undefined,
});

const toInsertRow = (d: z.infer<typeof DeviceInsertSchema>): DevicesInsertRow => ({
  id: d.id || generateDeviceId(),
  name: d.name,
  location: d.location,
  description: d.description ?? null,
  tags: d.tags ?? [],
  model: d.model ?? null,
  type: d.type ?? null,
  qrcode_url: null,
});

const toUpdateRow = (d: z.infer<typeof DeviceUpdateSchema>): DevicesUpdateRow => {
  const patch: DevicesUpdateRow = {} as DevicesUpdateRow;
  if (d.name !== undefined) patch.name = d.name;
  if (d.location !== undefined) patch.location = d.location;
  if (d.description !== undefined) patch.description = d.description ?? null;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.model !== undefined) patch.model = d.model ?? null;
  if (d.type !== undefined) patch.type = d.type ?? null;
  if (d.qrcodeUrl !== undefined) patch.qrcode_url = d.qrcodeUrl ?? null;
  return patch;
};

/** -------------------------------------------------------------------------
 * 3 · ERROR HANDLING
 * ------------------------------------------------------------------------*/

class DeviceActionError extends Error {
  public readonly code: string;
  public readonly errors?: z.ZodIssue[];
  constructor(message: string, code: string, errors?: z.ZodIssue[]) {
    super(message);
    this.name = "DeviceActionError";
    this.code = code;
    this.errors = errors;
  }
}

function handlePostgrestError(e: PostgrestError): never {
  switch (e.code) {
    case "23505":
      throw new DeviceActionError("ID già esistente", "DUPLICATE_ID");
    default:
      throw new DeviceActionError(e.message || "Errore inatteso; riprova più tardi", "DATABASE_ERROR");
  }
}

function handleZodError(e: z.ZodError): never {
  const errorsMessage = e.errors.map(err => {
    const path = err.path.join(".");
    return `${path}: ${err.message}`;
  }).join(", ");
  
  throw new DeviceActionError(
    `Errore di validazione: ${errorsMessage}`,
    "VALIDATION_ERROR",
    e.errors
  );
}

/** -------------------------------------------------------------------------
 * 4 · SERVER ACTIONS ( directive "use server" *within* each function )
 * ------------------------------------------------------------------------*/

export async function getDevices(
  params: unknown,
): Promise<{ devices: Device[]; hasMore: boolean }> {
  const { offset, limit } = ListParamsSchema.parse(params);

  const { data, count, error } = await (await supabase())
    .from("devices")
    .select("*", { count: "exact" })
    .eq("deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) handlePostgrestError(error);

  const devices = (data ?? []).map(toDevice);
  const hasMore = count !== null ? offset + limit < count : devices.length === limit;
  return { devices, hasMore };
}

export async function getDevice(id: string): Promise<Device | null> {
  const { data, error } = await (await supabase())
    .from("devices")
    .select("*")
    .eq("id", id)
    .eq("deleted", false)
    .maybeSingle();

  if (error) handlePostgrestError(error);
  return data ? toDevice(data) : null;
}

export async function createDevice(raw: unknown): Promise<Device> {
  try {
    const d = DeviceInsertSchema.parse(raw);

    const { data, error } = await (await supabase())
      .from("devices")
      .insert(toInsertRow(d))
      .select()
      .single();

    if (error) handlePostgrestError(error);

    // Log the activity
    await logCurrentUserActivity('create_device', 'device', data!.id, {
      device_name: data!.name,
      device_location: data!.location
    });

    revalidatePath("/device");
    return toDevice(data!);
  } catch (error) {
    if (error instanceof z.ZodError) {
      handleZodError(error);
    }
    throw error;
  }
}

export async function updateDevice(raw: unknown): Promise<Device> {
  try {
    const d = DeviceUpdateSchema.parse(raw);

    const { data, error } = await (await supabase())
      .from("devices")
      .update(toUpdateRow(d))
      .eq("id", d.id)
      .select()
      .single();

    if (error) handlePostgrestError(error);

    // Log the activity
    await logCurrentUserActivity('update_device', 'device', data!.id, {
      device_name: data!.name,
      device_location: data!.location
    });

    revalidatePath("/device");
    return toDevice(data!);
  } catch (error) {
    if (error instanceof z.ZodError) {
      handleZodError(error);
    }
    throw error;
  }
}

export async function deleteDevice(id: string): Promise<void> {
  // Soft delete: set deleted=true
  const { data: deviceData, error: fetchError } = await (await supabase())
    .from("devices")
    .select("name, location")
    .eq("id", id)
    .single();

  const { error } = await (await supabase())
    .from("devices")
    .update({ deleted: true })
    .eq("id", id);

  if (error) handlePostgrestError(error);

  // Log the activity
  if (deviceData) {
    await logCurrentUserActivity('delete_device', 'device', id, {
      device_name: deviceData.name,
      device_location: deviceData.location
    });
  }

  revalidatePath("/device");
}
