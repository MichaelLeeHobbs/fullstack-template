// ===========================================
// Socket.IO Namespace Orchestrator
// ===========================================
// Registers all Socket.IO namespaces.

import type { Server as SocketIOServer } from 'socket.io';
import { registerNotificationsNamespace } from './notifications.namespace.js';

export function registerNamespaces(io: SocketIOServer): void {
  registerNotificationsNamespace(io);
}
