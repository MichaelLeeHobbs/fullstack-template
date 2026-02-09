// ===========================================
// Socket.IO Client Factory
// ===========================================
// Creates namespace-scoped socket connections.

import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store.js';

export function createSocket(namespace: string): Socket {
  const token = useAuthStore.getState().accessToken;

  return io(namespace, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
}
