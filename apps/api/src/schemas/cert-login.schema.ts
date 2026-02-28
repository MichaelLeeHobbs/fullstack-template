// ===========================================
// Certificate Login Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const certLoginSchema = z.object({
  // No body needed - uses headers
});

export const generateAttachCodeSchema = z.object({
  // No body needed - uses authenticated user
});

export const attachCertificateSchema = z.object({
  code: z.string().uuid(),
  label: z.string().max(255).optional(),
});

export const removeCertBindingSchema = z.object({
  id: z.string().uuid(),
});

// Export types
export type AttachCertificateInput = z.infer<typeof attachCertificateSchema>;
