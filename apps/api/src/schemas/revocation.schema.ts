// ===========================================
// Revocation & Renewal Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const revokeCertificateSchema = z.object({
  reason: z.enum([
    'unspecified',
    'keyCompromise',
    'caCompromise',
    'affiliationChanged',
    'superseded',
    'cessationOfOperation',
    'certificateHold',
    'removeFromCRL',
    'privilegeWithdrawn',
    'aACompromise',
  ]).default('unspecified'),
  invalidityDate: z.string().datetime().optional(),
});

export const renewCertificateSchema = z.object({
  caPassphrase: z.string().min(1),
  validityDays: z.number().int().min(1).max(36500).optional(),
});

export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>;
export type RenewCertificateInput = z.infer<typeof renewCertificateSchema>;
