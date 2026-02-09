// ===========================================
// API Key Validation Schemas
// ===========================================

import { z } from 'zod/v4';
import { paginationSchema } from './pagination.schema.js';

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissionIds: z.array(z.string().uuid()).default([]),
  expiresAt: z.coerce.date().optional(),
  userId: z.string().uuid().optional(),
});

export const updateApiKeyPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export const listApiKeysQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const createServiceAccountSchema = z.object({
  email: z.email(),
});

export const listServiceAccountsQuerySchema = paginationSchema;

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyPermissionsInput = z.infer<typeof updateApiKeyPermissionsSchema>;
export type ListApiKeysQuery = z.infer<typeof listApiKeysQuerySchema>;
export type ListServiceAccountsQuery = z.infer<typeof listServiceAccountsQuerySchema>;
export type CreateServiceAccountInput = z.infer<typeof createServiceAccountSchema>;
