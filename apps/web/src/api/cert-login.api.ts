// ===========================================
// Certificate Login API
// ===========================================

import { api } from './client.js';
import type { UserCertificate, AttachCodeResponse, CertLoginResponse } from '@fullstack-template/shared';

export const certLoginApi = {
  login: () => api.post<CertLoginResponse>('/cert-login'),

  generateAttachCode: () => api.post<AttachCodeResponse>('/cert-attach/code'),

  attachCertificate: (data: { code: string; label?: string }) =>
    api.post<UserCertificate>('/cert-attach', data),

  getCertStatus: () => api.get<UserCertificate[]>('/cert-status'),

  removeBinding: (id: string) => api.delete<{ message: string }>(`/cert-binding/${id}`),
};
