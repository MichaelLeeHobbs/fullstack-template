// ===========================================
// MFA API
// ===========================================

import { api } from './client.js';
import type { AuthSuccessResponse } from './auth.api.js';

export interface TotpSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  method: string;
}

export interface BackupCodesResponse {
  backupCodes: string[];
}

export interface MfaVerifyLoginInput {
  tempToken: string;
  method: string;
  code: string;
}

export const mfaApi = {
  getMethods: () => api.get<string[]>('/mfa/methods'),

  setupTotp: () => api.post<TotpSetupResponse>('/mfa/totp/setup'),

  verifySetup: (code: string) =>
    api.post<BackupCodesResponse>('/mfa/totp/verify-setup', { code }),

  verifyLogin: (data: MfaVerifyLoginInput) =>
    api.post<AuthSuccessResponse>('/mfa/verify', data, { skipAuth: true }),

  disable: (method: string, code: string) =>
    api.post<{ message: string }>('/mfa/disable', { method, code }),

  regenerateBackupCodes: (method: string, code: string) =>
    api.post<BackupCodesResponse>('/mfa/backup-codes', { method, code }),
};
