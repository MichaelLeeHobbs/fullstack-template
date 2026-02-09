// ===========================================
// Notification Hooks
// ===========================================
// TanStack Query hooks for notification operations.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type ListNotificationsParams } from '../api/notifications.api.js';
import { useNotificationStore } from '../stores/notification.store.js';
import { useEffect } from 'react';

const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: ListNotificationsParams) => ['notifications', 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useNotifications(params?: ListNotificationsParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.list(params),
  });
}

export function useUnreadCount() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const query = useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000, // 60s fallback polling
  });

  // Sync to Zustand store
  useEffect(() => {
    if (query.data) {
      setUnreadCount(query.data.unreadCount);
    }
  }, [query.data, setUnreadCount]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
