// ===========================================
// PKI Audit Validation Schemas
// ===========================================

import { z } from 'zod/v4';
import { paginationSchema } from './pagination.schema.js';

export const listPkiAuditQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
});

export type ListPkiAuditQuery = z.infer<typeof listPkiAuditQuerySchema>;
