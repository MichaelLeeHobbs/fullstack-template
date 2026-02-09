// ===========================================
// useSocketEvent Hook
// ===========================================
// Subscribe to a Socket.IO event with automatic cleanup.

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

export function useSocketEvent<T = unknown>(
  socket: Socket | null,
  event: string,
  handler: (data: T) => void,
): void {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
