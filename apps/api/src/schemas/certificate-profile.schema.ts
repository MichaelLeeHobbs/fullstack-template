// ===========================================
// Certificate Profile Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const createProfileSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  certType: z.enum(['server', 'client', 'user', 'ca', 'smime']),
  allowedKeyAlgorithms: z.array(z.enum(['rsa', 'ecdsa'])).min(1).default(['rsa', 'ecdsa']),
  minKeySize: z.number().int().min(1024).max(8192).default(2048),
  keyUsage: z.array(z.string()).min(1),
  extKeyUsage: z.array(z.string()).default([]),
  basicConstraints: z.object({
    ca: z.boolean(),
    pathLenConstraint: z.number().int().min(0).optional(),
  }).nullable().optional(),
  maxValidityDays: z.number().int().min(1).max(36500).default(365),
  subjectConstraints: z.record(z.string(), z.unknown()).nullable().optional(),
  sanConstraints: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

export const listProfileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  certType: z.enum(['server', 'client', 'user', 'ca', 'smime']).optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ListProfileQuery = z.infer<typeof listProfileQuerySchema>;
