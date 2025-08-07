import { z } from "zod";

// Schema base condiviso tra client e server
export const DeviceFormSchema = z.object({
  id: z.string().regex(/^D[A-Z0-9]{7}$/, { message: "ID deve essere nel formato D seguito da 7 caratteri alfanumerici (es: DABC1234)" }),
  name: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri" }).max(60, { message: "Il nome non può superare i 60 caratteri" }),
  location: z.string().min(2, { message: "La posizione deve contenere almeno 2 caratteri" }).max(120, { message: "La posizione non può superare i 120 caratteri" }),
  description: z.string().max(250, { message: "La descrizione non può superare i 250 caratteri" }).optional().or(z.literal("")),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
});

// Schema esteso con campi aggiuntivi per il modello completo
export const DeviceSchema = DeviceFormSchema.extend({
  model: z.string().max(60, { message: "Il modello non può superare i 60 caratteri" }).nullish(),
  type: z.string().max(40, { message: "Il tipo non può superare i 40 caratteri" }).nullish(),
  qrcodeUrl: z.string().url({ message: "URL QR Code non valido" }).nullish(),
  created_at: z.string().nullable(),
});

export type Device = z.infer<typeof DeviceSchema>;

export const DeviceInsertSchema = DeviceSchema.omit({
  qrcodeUrl: true,
  created_at: true,
}).extend({
  description: z.string().max(250).nullish().optional(),
});

export const DeviceUpdateSchema = DeviceSchema.partial().extend({
  id: z.string().regex(/^D[A-Z0-9]{7}$/, { message: "ID deve essere nel formato D seguito da 7 caratteri alfanumerici (es: DABC1234)" }),
});

export const ListParamsSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
}); 