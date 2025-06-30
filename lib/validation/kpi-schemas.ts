import { z } from "zod";

// Helper per rappresentare JSON in Zod (semplice ma efficace)
export const JsonSchema: z.ZodType<
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

// Schema base per KPI
export const KpiSchema = z.object({
  id: z.string().regex(/^K[A-Z0-9]{7}$/, { message: "ID deve essere nel formato K seguito da 7 caratteri alfanumerici (es: KXYZ5678)" }),
  name: z.string(),
  description: z.string().nullable(),
  value: z.any(),
  created_at: z.string().nullable()
});

export type Kpi = z.infer<typeof KpiSchema>;

// Schema per i parametri di lista
export const ListParamsSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

// Schema per creazione KPI
export const KpiInsertSchema = z.object({
  id: z.string().regex(/^K[A-Z0-9]{7}$/, { message: "ID deve essere nel formato K seguito da 7 caratteri alfanumerici (es: KXYZ5678)" }).optional(),
  name: z.string().min(1, { message: "Nome richiesto" }),
  description: z.string().optional(),
  value: z.any().optional(),
});

// Schema per il form KPI
export const KpiFormSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Nome richiesto" }),
  description: z.string().optional(),
  value: z.array(z.object({
    name: z.string().min(1, { message: "Nome campo richiesto" }),
    type: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    min: z.union([z.string(), z.number()]).optional(),
    max: z.union([z.string(), z.number()]).optional(),
    options: z.array(z.string()).optional()
  }))
});

export type ListParams = z.infer<typeof ListParamsSchema>;
export type KpiInsert = z.infer<typeof KpiInsertSchema>;
export type KpiForm = z.infer<typeof KpiFormSchema>; 