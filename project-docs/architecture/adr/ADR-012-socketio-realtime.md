# ADR-012: Socket.IO for Real-Time

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | realtime, websocket, notifications, frontend |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The application needs real-time server-to-client communication for notifications (new messages, role changes, certificate expiry alerts) and live UI updates without polling. The solution must handle connection interruptions gracefully (network switches, mobile backgrounding), work behind reverse proxies and load balancers, and integrate with the existing Express HTTP server and JWT authentication. The frontend needs a connection state indicator and automatic reconnection with exponential backoff.

## Decision

Use Socket.IO for all real-time communication, initialized as a singleton alongside the Express HTTP server:

**Server setup** (`src/lib/socket.ts`):
- Socket.IO server is attached to the existing HTTP server instance -- no separate port
- CORS is configured to match the frontend URL with credentials support
- Transport preference is WebSocket with polling as a fallback for restrictive networks
- Ping timeout (20s) and ping interval (25s) detect dead connections

**Architecture**:
- The server uses room-based messaging: each authenticated user joins a room named by their user ID
- Services emit events to specific user rooms via `getIO()?.to(userId).emit(event, data)`
- The frontend `socket.store.ts` manages connection state and exposes a reactive `isConnected` flag
- Events are typed using shared interfaces from `@fullstack-template/shared`

**Current event channels**:
- `notification:new` -- Real-time notification delivery to specific users
- `notification:count` -- Updated unread count after server-side changes

**Authentication**: Socket connections include the access token for initial authentication. The server validates the token in the Socket.IO middleware before allowing the connection, and adds the user to their user-specific room.

## Consequences

### Positive

- Automatic reconnection with exponential backoff handles network interruptions without application code
- WebSocket with polling fallback ensures connectivity even behind restrictive corporate proxies
- Room-based messaging provides efficient targeted delivery without broadcasting to all connections
- Shared HTTP server means no additional port to manage or expose through firewalls
- Socket.IO's built-in acknowledgement system enables reliable delivery confirmation when needed

### Negative

- Socket.IO adds ~40KB to the frontend bundle (client library) and maintains a persistent connection per user
- Not a standard WebSocket protocol -- Socket.IO uses its own framing, so clients must use the Socket.IO client library (cannot use raw WebSocket clients)
- Horizontal scaling requires a Redis adapter (`@socket.io/redis-adapter`) to broadcast events across multiple server instances -- not included in the base template
- Persistent connections consume server memory proportional to connected users, which may be a concern at scale
- Token expiry during an active socket connection requires re-authentication logic in the socket middleware

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Server-Sent Events (SSE) | Native browser API, simpler, HTTP-based | Server-to-client only (no bidirectional), no rooms, reconnection is manual, limited browser connection pool | Rejected |
| Raw WebSockets (ws library) | Standard protocol, lightweight, any client | No automatic reconnection, no rooms, no fallback transport, manual ping/pong | Rejected |
| Long polling | Works everywhere, simple implementation | High latency, server resource waste, poor UX for real-time updates | Rejected |
| GraphQL Subscriptions | Typed, integrates with GraphQL data layer | Requires GraphQL adoption, heavier infrastructure, this project uses REST | Rejected |
| **Socket.IO** | Reconnection, rooms, transport fallback, shared HTTP server, mature library | Non-standard protocol, bundle size, Redis needed for multi-instance | **Selected** |
