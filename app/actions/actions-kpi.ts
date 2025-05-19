"use server"

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { Database } from "@/supabase/database.types";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

/** -------------------------------------------------------------------------
 * 1 · VALIDAZIONE ZOD
 * ------------------------------------------------------------------------*/

// Helper per rappresentare JSON in Zod (semplice ma efficace)
const JsonSchema: z.ZodType<
  string | number | boolean | null | { [k: string]: any } | Array<any>
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonSchema),
    z.record(JsonSchema),
  ]),
);

const KpiBase = z.object({
  id: z.string().uuid({ message: "ID deve essere un UUID v4" }),
  name: z.string().min(2).max(80),
  description: z.string().max(250).nullish(),
  value: JsonSchema, // qualsiasi JSON valido
});
export type Kpi = z.infer<typeof KpiBase>;

const KpiInsertSchema = KpiBase.extend({
  description: z.string().max(250).nullish().optional(),
});

const KpiUpdateSchema = KpiBase.partial().extend({
  id: z.string().uuid(),
});

const ListParamsSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** -------------------------------------------------------------------------
 * 2 · SUPABASE CLIENT TIPIZZATO
 * ------------------------------------------------------------------------*/

type KpisTable = Database["public"]["Tables"]["kpis"];
export type KpisRow = KpisTable["Row"];
type KpisInsertRow = KpisTable["Insert"];
type KpisUpdateRow = KpisTable["Update"];

const supabase = (): SupabaseClient<Database> =>
  createServerSupabaseClient() as SupabaseClient<Database>;

/** -------------------------------------------------------------------------
 * 3 · MAPPERS camelCase ⇆ snake_case
 * ------------------------------------------------------------------------*/

const toKpi = (row: KpisRow): Kpi => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  value: row.value,
});

const toInsertRow = (k: z.infer<typeof KpiInsertSchema>): KpisInsertRow => ({
  id: k.id,
  name: k.name,
  description: k.description ?? null,
  value: k.value,
  // created_at gestito dal DB
});

const toUpdateRow = (k: z.infer<typeof KpiUpdateSchema>): KpisUpdateRow => {
  const patch: KpisUpdateRow = {} as KpisUpdateRow;
  if (k.name !== undefined) patch.name = k.name;
  if (k.description !== undefined) patch.description = k.description ?? null;
  if (k.value !== undefined) patch.value = k.value;
  return patch;
};

/** -------------------------------------------------------------------------
 * 4 · ERROR HANDLING
 * ------------------------------------------------------------------------*/

function handlePostgrestError(e: PostgrestError): never {
  switch (e.code) {
    case "23505":
      throw new Error("ID già esistente");
    default:
      throw new Error(e.message || "Errore inatteso; riprova più tardi");
  }
}

/** -------------------------------------------------------------------------
 * 5 · SERVER ACTIONS
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
  const k = KpiInsertSchema.parse(raw);

  const { data, error } = await supabase()
    .from("kpis")
    .insert(toInsertRow(k))
    .select()
    .single();

  if (error) handlePostgrestError(error);

  revalidatePath("/kpi");
  return toKpi(data!);
}

export async function updateKpi(raw: unknown): Promise<Kpi> {
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
}

export async function deleteKpi(id: string): Promise<void> {
  const { error } = await supabase()
    .from("kpis")
    .delete()
    .eq("id", id);

  if (error) handlePostgrestError(error);
  revalidatePath("/kpi");
}
