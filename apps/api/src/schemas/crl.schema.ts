// ===========================================
// CRL Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const generateCrlSchema = z.object({
  caPassphrase: z.string().min(1),
});

export const listCrlQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GenerateCrlInput = z.infer<typeof generateCrlSchema>;
export type ListCrlQuery = z.infer<typeof listCrlQuerySchema>;
