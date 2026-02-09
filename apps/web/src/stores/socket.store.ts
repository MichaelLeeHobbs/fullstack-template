// ===========================================
// Socket Store
// ===========================================
// Tracks Socket.IO connection state.

import { create } from 'zustand';

interface SocketState {
  isConnected: boolean;
  connectionError: string | null;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  reset: () => void;
}

export const useSocketStore = create<SocketState>()((set) => ({
  isConnected: false,
  connectionError: null,
  setConnected: (connected) => set({ isConnected: connected, connectionError: null }),
  setConnectionError: (error) => set({ connectionError: error, isConnected: false }),
  reset: () => set({ isConnected: false, connectionError: null }),
}));
