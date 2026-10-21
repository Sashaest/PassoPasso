import { z } from "zod";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const deviceIdSchema = z.string().regex(uuidRe, "device id non valido");

export const breakdownRequestSchema = z.object({
  compito: z.string().trim().min(2).max(300),
  dettagli: z.string().trim().max(500).optional(),
});

export const prioritiesRequestSchema = z.object({
  momento: z.enum(["mattina", "sera"]),
  oggi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  compiti: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        titolo: z.string().trim().min(1).max(300),
        scadenza: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .min(1)
    .max(40),
});

export const waitlistRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consenso: z.literal(true),
  // honeypot anti-bot: deve restare vuoto
  sito: z.string().max(0).optional(),
  origine: z.string().max(40).optional(),
});

/** Risposta dell'AI per lo spezza-compiti, dopo la normalizzazione. */
export const breakdownResultSchema = z.object({
  passi: z
    .array(
      z.object({
        testo: z.string().min(1),
        minuti: z.number(),
      }),
    )
    .min(1),
  incoraggiamento: z.string(),
});

export const prioritiesResultSchema = z.object({
  priorita: z.array(z.object({ id: z.string(), motivo: z.string() })),
  messaggio: z.string(),
});

export type BreakdownRequest = z.infer<typeof breakdownRequestSchema>;
export type PrioritiesRequest = z.infer<typeof prioritiesRequestSchema>;
export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
export type BreakdownResult = z.infer<typeof breakdownResultSchema>;
export type PrioritiesResult = z.infer<typeof prioritiesResultSchema>;
