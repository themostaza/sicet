"use server"

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { Database } from "@/supabase/database.types";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import {
  Kpi,
  KpiInsertSchema,
  KpiUpdateSchema,
  ListParamsSchema
} from "@/lib/validation/kpi-schemas";

/** -------------------------------------------------------------------------
 * 1 · SUPABASE CLIENT TIPIZZATO
 * ------------------------------------------------------------------------*/

type KpisTable = Database["public"]["Tables"]["kpis"];
export type KpisRow = KpisTable["Row"];
type KpisInsertRow = KpisTable["Insert"];
type KpisUpdateRow = KpisTable["Update"];

const supabase = (): SupabaseClient<Database> =>
  createServerSupabaseClient() as SupabaseClient<Database>;

/** -------------------------------------------------------------------------
 * 2 · MAPPERS camelCase ⇆ snake_case
 * ------------------------------------------------------------------------*/

const toKpi = (row: KpisRow): Kpi => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  value: row.value,
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
  
  return {
    id: k.id,
    name: k.name,
    description: k.description ?? null,
    value: processedValue,
  };
};

const toUpdateRow = (k: z.infer<typeof KpiUpdateSchema>): KpisUpdateRow => {
  const patch: KpisUpdateRow = {} as KpisUpdateRow;
  if (k.name !== undefined) patch.name = k.name;
  if (k.description !== undefined) patch.description = k.description ?? null;
  
  if (k.value !== undefined) {
    // Stesso trattamento di value come in toInsertRow
    let processedValue = k.value;
    if (typeof k.value === 'string') {
      try {
        processedValue = JSON.parse(k.value);
      } catch (e) {
        throw new KpiActionError("Il valore deve essere un JSON valido", "VALIDATION_ERROR");
      }
    }
    patch.value = processedValue;
  }
  
  return patch;
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

  const { data, count, error } = await supabase()
    .from("kpis")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) handlePostgrestError(error);

  const kpis = (data ?? []).map(toKpi);
  const hasMore = count !== null ? offset + limit < count : kpis.length === limit;
  return { kpis, hasMore };
}

export async function getKpi(id: string): Promise<Kpi | null> {
  const { data, error } = await supabase()
    .from("kpis")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) handlePostgrestError(error);
  return data ? toKpi(data) : null;
}

export async function createKpi(raw: unknown): Promise<Kpi> {
  try {
    // Log per debug
    console.log("Raw data:", JSON.stringify(raw));
    
    const k = KpiInsertSchema.parse(raw);
    
    const insertRow = toInsertRow(k);
    console.log("Processed data:", JSON.stringify(insertRow));

    const { data, error } = await supabase()
      .from("kpis")
      .insert(insertRow)
      .select()
      .single();

    if (error) handlePostgrestError(error);

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

export async function updateKpi(raw: unknown): Promise<Kpi> {
  try {
    const k = KpiUpdateSchema.parse(raw);

    const { data, error } = await supabase()
      .from("kpis")
      .update(toUpdateRow(k))
      .eq("id", k.id)
      .select()
      .single();

    if (error) handlePostgrestError(error);

    revalidatePath("/kpi");
    return toKpi(data!);
  } catch (error) {
    if (error instanceof z.ZodError) {
      handleZodError(error);
    }
    throw error;
  }
}

export async function deleteKpi(id: string): Promise<void> {
  const { error } = await supabase()
    .from("kpis")
    .delete()
    .eq("id", id);

  if (error) handlePostgrestError(error);
  revalidatePath("/kpi");
}
