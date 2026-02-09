// ===========================================
// useSocket Hook
// ===========================================
// Access Socket.IO context.

import { useContext } from 'react';
import { SocketContext } from '../providers/SocketProvider.js';

export function useSocket() {
  return useContext(SocketContext);
}
