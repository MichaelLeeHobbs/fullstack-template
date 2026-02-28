// ===========================================
// CSR Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const submitCsrSchema = z.object({
  csrPem: z.string().min(1),
  targetCaId: z.string().uuid(),
  profileId: z.string().uuid().optional(),
});

export const approveCsrSchema = z.object({
  caPassphrase: z.string().min(1),
  validityDays: z.number().int().min(1).max(36500).optional(),
});

export const rejectCsrSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const listCsrQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  targetCaId: z.string().uuid().optional(),
});

export type SubmitCsrInput = z.infer<typeof submitCsrSchema>;
export type ApproveCsrInput = z.infer<typeof approveCsrSchema>;
export type RejectCsrInput = z.infer<typeof rejectCsrSchema>;
export type ListCsrQuery = z.infer<typeof listCsrQuerySchema>;
