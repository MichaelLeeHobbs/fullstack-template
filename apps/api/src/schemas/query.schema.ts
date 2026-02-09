// ===========================================
// Shared Query Schemas
// ===========================================

import { z } from 'zod/v4';

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export type SortInput = z.infer<typeof sortSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
