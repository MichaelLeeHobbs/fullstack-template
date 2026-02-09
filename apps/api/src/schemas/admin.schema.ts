// ===========================================
// Admin Validation Schemas
// ===========================================

import { z } from 'zod/v4';
import { paginationSchema } from './pagination.schema.js';
import { sortSchema } from './query.schema.js';

export const listUsersQuerySchema = paginationSchema.merge(sortSchema).extend({
  sortBy: z.enum(['email', 'createdAt', 'lastLoginAt']).optional(),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isAdmin: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

export const listAuditLogsQuerySchema = paginationSchema.merge(sortSchema).extend({
  sortBy: z.enum(['createdAt', 'action']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  userId: z.string().uuid().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
