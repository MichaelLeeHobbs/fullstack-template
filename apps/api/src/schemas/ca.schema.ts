// ===========================================
// CA Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const createCaSchema = z.object({
  name: z.string().min(1).max(255),
  commonName: z.string().min(1).max(255),
  organization: z.string().max(255).optional(),
  organizationalUnit: z.string().max(255).optional(),
  country: z.string().length(2).optional(),
  state: z.string().max(128).optional(),
  locality: z.string().max(128).optional(),
  parentCaId: z.string().uuid().optional(),  // if provided, creates intermediate CA
  parentPassphrase: z.string().min(1).optional(),  // required when parentCaId is set
  passphrase: z.string().min(8, 'Passphrase must be at least 8 characters'),
  keyAlgorithm: z.enum(['rsa', 'ecdsa']).default('rsa'),
  keySize: z.number().int().min(2048).max(4096).optional(),
  keyCurve: z.string().optional(),
  maxValidityDays: z.number().int().min(1).max(36500).default(3650),
  pathLenConstraint: z.number().int().min(0).optional(),
  crlDistributionUrl: z.string().url().optional(),
  ocspUrl: z.string().url().optional(),
}).refine(
  (data) => !data.parentCaId || data.parentPassphrase,
  { message: 'Parent passphrase is required when creating an intermediate CA', path: ['parentPassphrase'] }
);

export const updateCaSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  maxValidityDays: z.number().int().min(1).max(36500).optional(),
  crlDistributionUrl: z.string().url().nullable().optional(),
  ocspUrl: z.string().url().nullable().optional(),
});

export const listCaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended', 'retired']).optional(),
  isRoot: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export type CreateCaInput = z.infer<typeof createCaSchema>;
export type UpdateCaInput = z.infer<typeof updateCaSchema>;
export type ListCaQuery = z.infer<typeof listCaQuerySchema>;
