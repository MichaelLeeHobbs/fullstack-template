// ===========================================
// Admin API
// ===========================================
// API calls for admin-only endpoints.

import { api } from './client.js';

// ===========================================
// Settings Types
// ===========================================

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsData {
  settings: SystemSetting[];
  grouped: Record<string, SystemSetting[]>;
}

// ===========================================
// User Types
// ===========================================

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserDetails extends AdminUser {
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}

// ===========================================
// Audit Types
// ===========================================

export interface AuditLog {
  id: string;
  userId: string | null;
  actorEmail: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  success: boolean;
  createdAt: string;
}

// ===========================================
// Admin API
// ===========================================

export const adminApi = {
  // Settings
  async getSettings(): Promise<SettingsData> {
    return api.get<SettingsData>('/admin/settings');
  },

  async updateSetting(key: string, value: unknown): Promise<void> {
    await api.patch(`/admin/settings/${encodeURIComponent(key)}`, { value });
  },

  // Users
  async listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<AdminUser>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.isActive !== undefined) query.set('isActive', params.isActive.toString());
    if (params.isAdmin !== undefined) query.set('isAdmin', params.isAdmin.toString());

    const queryString = query.toString();
    return api.get<PaginatedResponse<AdminUser>>(`/admin/users${queryString ? `?${queryString}` : ''}`);
  },

  async getUser(userId: string): Promise<UserDetails> {
    return api.get<UserDetails>(`/admin/users/${userId}`);
  },

  async updateUser(userId: string, data: { isActive?: boolean; isAdmin?: boolean }): Promise<AdminUser> {
    return api.patch<AdminUser>(`/admin/users/${userId}`, data);
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/admin/users/${userId}`);
  },

  // Audit Logs
  async listAuditLogs(
    page = 1,
    limit = 50,
    userId?: string
  ): Promise<PaginatedResponse<AuditLog>> {
    const query = new URLSearchParams();
    query.set('page', page.toString());
    query.set('limit', limit.toString());
    if (userId) query.set('userId', userId);

    return api.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${query.toString()}`);
  },
};

