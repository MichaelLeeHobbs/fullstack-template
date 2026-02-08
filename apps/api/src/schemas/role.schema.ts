// ===========================================
// Role Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional(),
});

export const setPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export const setUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetPermissionsInput = z.infer<typeof setPermissionsSchema>;
export type SetUserRolesInput = z.infer<typeof setUserRolesSchema>;
