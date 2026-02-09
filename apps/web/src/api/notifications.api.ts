// ===========================================
// Notifications API
// ===========================================
// REST client functions for notification endpoints.

import { api } from './client.js';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  type: string;
  category: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  meta: {
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  };
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationsApi = {
  list: (params?: ListNotificationsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');
    const query = searchParams.toString();
    return api.get<NotificationListResponse>(`/notifications${query ? `?${query}` : ''}`);
  },

  unreadCount: () =>
    api.get<{ unreadCount: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    api.patch<{ message: string }>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch<{ message: string }>('/notifications/read-all'),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/notifications/${id}`),
};
