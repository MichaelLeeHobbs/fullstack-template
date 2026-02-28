// ===========================================
// Certificate Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const issueCertificateSchema = z.object({
  caId: z.string().uuid(),
  caPassphrase: z.string().min(1),
  profileId: z.string().uuid().optional(),
  commonName: z.string().min(1).max(255),
  organization: z.string().max(255).optional(),
  organizationalUnit: z.string().max(255).optional(),
  country: z.string().length(2).optional(),
  state: z.string().max(128).optional(),
  locality: z.string().max(128).optional(),
  sans: z.array(z.object({
    type: z.enum(['dns', 'ip', 'email', 'uri']),
    value: z.string().min(1),
  })).optional(),
  keyAlgorithm: z.enum(['rsa', 'ecdsa']).default('rsa'),
  keySize: z.number().int().min(2048).max(4096).optional(),
  keyCurve: z.string().optional(),
  validityDays: z.number().int().min(1).max(36500).default(365),
});

export const listCertificateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  caId: z.string().uuid().optional(),
  status: z.enum(['active', 'revoked', 'expired', 'suspended']).optional(),
  certType: z.enum(['server', 'client', 'user', 'ca', 'smime']).optional(),
  search: z.string().max(255).optional(),
});

export const downloadCertificateSchema = z.object({
  format: z.enum(['pem', 'der', 'pkcs12']).default('pem'),
  password: z.string().min(1).optional(), // required for pkcs12
  includeChain: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
}).refine(
  (data) => data.format !== 'pkcs12' || data.password,
  { message: 'Password is required for PKCS#12 format', path: ['password'] }
);

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
export type ListCertificateQuery = z.infer<typeof listCertificateQuerySchema>;
export type DownloadCertificateInput = z.infer<typeof downloadCertificateSchema>;
