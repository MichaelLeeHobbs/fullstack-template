// ===========================================
// Sessions API
// ===========================================

import { api } from './client.js';

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export const sessionsApi = {
  list: () => api.get<SessionInfo[]>('/sessions'),

  revoke: (id: string) => api.delete<{ message: string }>(`/sessions/${id}`),

  revokeAll: () => api.delete<{ message: string }>('/sessions'),
};
