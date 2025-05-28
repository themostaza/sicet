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
export const KpiFormSchema = z.object({
  id: z.string().uuid({ message: "ID deve essere un UUID v4 valido" }),
  name: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri" }).max(80, { message: "Il nome non può superare gli 80 caratteri" }),
  description: z.string().max(250, { message: "La descrizione non può superare i 250 caratteri" }).optional().or(z.literal("")),
  value: z.union([
    // Supporta array di campi (dal client)
    z.array(z.object({
      name: z.string().min(1, { message: "Il nome del campo è obbligatorio" }),
      type: z.string(),
      description: z.string().optional(),
      required: z.boolean().optional().default(false),
      min: z.union([z.string(), z.number()]).optional(),
      max: z.union([z.string(), z.number()]).optional(),
    })).nonempty({ message: "Aggiungi almeno un campo" }),
    // Supporta anche altri formati JSON validi (per retrocompatibilità)
    JsonSchema
  ]),
});

export type Kpi = z.infer<typeof KpiFormSchema>;

export const KpiInsertSchema = KpiFormSchema.extend({
  description: z.string().max(250).nullish().optional(),
});

export const KpiUpdateSchema = KpiFormSchema.partial().extend({
  id: z.string().uuid({ message: "ID deve essere un UUID v4 valido" }),
});

export const ListParamsSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}); 