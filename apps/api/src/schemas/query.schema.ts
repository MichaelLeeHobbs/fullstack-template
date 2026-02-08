// ===========================================
// Shared Sorting Schema
// ===========================================

import { z } from 'zod/v4';

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SortInput = z.infer<typeof sortSchema>;
