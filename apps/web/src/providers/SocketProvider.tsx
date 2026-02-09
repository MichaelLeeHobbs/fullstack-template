// ===========================================
// Socket Provider
// ===========================================
// Manages Socket.IO connections keyed on auth state.

import { createContext, useEffect, useRef, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { createSocket } from '../lib/socket.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useSocketStore } from '../stores/socket.store.js';
import { useNotificationStore } from '../stores/notification.store.js';

export interface SocketContextValue {
  notificationSocket: Socket | null;
}

export const SocketContext = createContext<SocketContextValue>({
  notificationSocket: null,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { setConnected, setConnectionError, reset: resetSocket } = useSocketStore();
  const { incrementUnread, setUnreadCount, reset: resetNotifications } = useNotificationStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Disconnect and clean up
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      resetSocket();
      resetNotifications();
      return;
    }

    // Create and connect
    const socket = createSocket('/notifications');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
    });

    // Notification events
    socket.on('notification:new', () => {
      incrementUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:count_update', (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    });

    socket.on('notification:read', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:read_all', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('notification:deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken]);

  return (
    <SocketContext.Provider value={{ notificationSocket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}
