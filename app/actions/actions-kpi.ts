"use server"

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Database } from "@/supabase/database.types";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import {
  Kpi,
  KpiInsertSchema,
  ListParamsSchema
} from "@/lib/validation/kpi-schemas";
import { logCurrentUserActivity } from "./actions-activity";

/** -------------------------------------------------------------------------
 * 1 · SUPABASE CLIENT TIPIZZATO
 * ------------------------------------------------------------------------*/

type KpisTable = Database["public"]["Tables"]["kpis"];
export type KpisRow = KpisTable["Row"];
type KpisInsertRow = KpisTable["Insert"];
type KpisUpdateRow = KpisTable["Update"];

const supabase = async (): Promise<SupabaseClient<Database>> =>
  await createServerSupabaseClient();

/** -------------------------------------------------------------------------
 * 2 · MAPPERS camelCase ⇆ snake_case
 * ------------------------------------------------------------------------*/

const toKpi = (row: KpisRow): Kpi => ({
  id: row.id,
  name: row.name,
  description: row.description,
  value: row.value,
  created_at: row.created_at
});

const toInsertRow = (k: z.infer<typeof KpiInsertSchema>): KpisInsertRow => {
  // Assicuriamoci che value sia sempre un array valido o un oggetto per il DB
  let processedValue = k.value;
  
  // Se value è una stringa, proviamo a parsarla come JSON
  if (typeof k.value === 'string') {
    try {
      processedValue = JSON.parse(k.value);
    } catch (e) {
      throw new KpiActionError("Il valore deve essere un JSON valido", "VALIDATION_ERROR");
    }
  }
  
  // Generate a unique ID if one isn't provided
  const id = k.id || crypto.randomUUID();
  
  return {
    id,
    name: k.name,
    description: k.description ?? null,
    value: processedValue,
  };
};

/** -------------------------------------------------------------------------
 * 3 · ERROR HANDLING
 * ------------------------------------------------------------------------*/

class KpiActionError extends Error {
  public readonly code: string;
  public readonly errors?: z.ZodIssue[];
  constructor(message: string, code: string, errors?: z.ZodIssue[]) {
    super(message);
    this.name = "KpiActionError";
    this.code = code;
    this.errors = errors;
  }
}

function handlePostgrestError(e: PostgrestError): never {
  switch (e.code) {
    case "23505":
      throw new KpiActionError("ID già esistente", "DUPLICATE_ID");
    default:
      throw new KpiActionError(e.message || "Errore inatteso; riprova più tardi", "DATABASE_ERROR");
  }
}

function handleZodError(e: z.ZodError): never {
  const errorsMessage = e.errors.map(err => {
    const path = err.path.join(".");
    return `${path}: ${err.message}`;
  }).join(", ");
  
  throw new KpiActionError(
    `Errore di validazione: ${errorsMessage}`,
    "VALIDATION_ERROR",
    e.errors
  );
}

/** -------------------------------------------------------------------------
 * 4 · SERVER ACTIONS
 * ------------------------------------------------------------------------*/

export async function getKpis(
  params: unknown,
): Promise<{ kpis: Kpi[]; hasMore: boolean }> {
  const { offset, limit } = ListParamsSchema.parse(params);

  const { data, count, error } = await (await supabase())
    .from("kpis")
    .select("*", { count: "exact" })
    .eq("deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) handlePostgrestError(error);

  const kpis = (data ?? []).map(toKpi);
  const hasMore = count !== null ? offset + limit < count : kpis.length === limit;
  return { kpis, hasMore };
}

export async function getKpi(id: string): Promise<Kpi | null> {
  const { data, error } = await (await supabase())
    .from("kpis")
    .select("*")
    .eq("id", id)
    .eq("deleted", false)
    .maybeSingle();

  if (error) handlePostgrestError(error);
  return data ? toKpi(data) : null;
}

export async function createKpi(raw: unknown): Promise<Kpi> {
  try {
    const k = KpiInsertSchema.parse(raw);
    
    const insertRow = toInsertRow(k);

    const { data, error } = await (await supabase())
      .from("kpis")
      .insert(insertRow)
      .select()
      .single();

    if (error) handlePostgrestError(error);

    // Log the activity
    await logCurrentUserActivity('create_kpi', 'kpi', data!.id, {
      kpi_name: data!.name,
      kpi_description: data!.description
    });

    revalidatePath("/kpi");
    return toKpi(data!);
  } catch (error) {
    if (error instanceof z.ZodError) {
      handleZodError(error);
    }
    console.error("Error creating KPI:", error);
    throw error;
  }
}

export async function deleteKpi(id: string): Promise<void> {
  // Soft delete: set deleted=true
  const { data: kpiData } = await (await supabase())
    .from("kpis")
    .select("name, description")
    .eq("id", id)
    .single();

  const { error } = await (await supabase())
    .from("kpis")
    .update({ deleted: true })
    .eq("id", id);

  if (error) handlePostgrestError(error);

  // Log the activity
  if (kpiData) {
    await logCurrentUserActivity('delete_kpi', 'kpi', id, {
      kpi_name: kpiData.name,
      kpi_description: kpiData.description
    });
  }

  revalidatePath("/kpi");
}
