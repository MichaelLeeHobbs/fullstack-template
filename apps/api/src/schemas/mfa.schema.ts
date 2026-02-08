// ===========================================
// MFA Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const mfaVerifySetupSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
});

export const mfaVerifyLoginSchema = z.object({
  tempToken: z.string().min(1, 'Temp token is required'),
  method: z.string().min(1, 'Method is required'),
  code: z.string().min(1, 'Code is required'),
});

export const mfaDisableSchema = z.object({
  method: z.string().min(1, 'Method is required'),
  code: z.string().min(1, 'Code is required'),
});

export const mfaRegenerateBackupCodesSchema = z.object({
  method: z.string().min(1, 'Method is required'),
  code: z.string().min(1, 'Code is required'),
});

export type MfaVerifySetupInput = z.infer<typeof mfaVerifySetupSchema>;
export type MfaVerifyLoginInput = z.infer<typeof mfaVerifyLoginSchema>;
export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
export type MfaRegenerateBackupCodesInput = z.infer<typeof mfaRegenerateBackupCodesSchema>;
