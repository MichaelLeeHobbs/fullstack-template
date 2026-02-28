# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the fullstack template project. ADRs document significant architectural choices, their context, and consequences.

## Index

| ADR | Title | Status | Date | Summary |
|-----|-------|--------|------|---------|
| [ADR-001](./ADR-001-four-layer-backend.md) | Four-Layer Backend Architecture | Accepted | 2025-01-15 | Router, Controller, Service, Model separation with strict layer responsibilities |
| [ADR-002](./ADR-002-result-pattern.md) | Result Pattern with stderr-lib | Accepted | 2025-01-15 | Services return Result&lt;T&gt; via tryCatch() instead of throwing exceptions |
| [ADR-003](./ADR-003-jwt-dual-token-auth.md) | JWT Dual-Token Authentication | Accepted | 2025-01-15 | Short-lived access tokens paired with database-backed refresh tokens |
| [ADR-004](./ADR-004-rbac-permissions.md) | RBAC with Permission-Based Access Control | Accepted | 2025-01-15 | Role-based access with granular permissions and immutable system roles |
| [ADR-005](./ADR-005-drizzle-orm.md) | Drizzle ORM | Accepted | 2025-01-15 | TypeScript-first, SQL-like ORM with lightweight runtime and migration support |
| [ADR-006](./ADR-006-pino-logging.md) | Pino Structured Logging | Accepted | 2025-01-15 | Fast JSON structured logging with pino-http middleware integration |
| [ADR-007](./ADR-007-zod-v4-validation.md) | Zod v4 Validation | Accepted | 2025-01-15 | Schema-first request validation with TypeScript type inference |
| [ADR-008](./ADR-008-zustand-state.md) | Zustand State Management | Accepted | 2025-01-15 | Minimal, TypeScript-first client state management without providers |
| [ADR-009](./ADR-009-pki-database-ca.md) | PKI with Database-Backed CA | Accepted | 2025-01-15 | Certificate authority system with encrypted database storage and mTLS support |
| [ADR-010](./ADR-010-totp-mfa.md) | TOTP-Based MFA | Accepted | 2025-01-15 | Time-based one-time passwords with QR provisioning and hashed backup codes |
| [ADR-011](./ADR-011-httponly-refresh-cookies.md) | HttpOnly Refresh Token Cookies | Accepted | 2025-01-15 | Refresh tokens stored in HttpOnly cookies to mitigate XSS attacks |
| [ADR-012](./ADR-012-socketio-realtime.md) | Socket.IO for Real-Time | Accepted | 2025-01-15 | Room-based real-time messaging with automatic reconnection for notifications |
| [ADR-013](./ADR-013-pgboss-jobs.md) | pg-boss for Background Jobs | Accepted | 2025-01-15 | PostgreSQL-native job queue eliminating Redis dependency |

## Creating a New ADR

1. Copy [TEMPLATE.md](./TEMPLATE.md)
2. Name it `ADR-NNN-short-title.md` using the next available number
3. Fill in all sections with substantive reasoning
4. Add an entry to this index table
5. Set status to `Proposed` until team review, then `Accepted`

## Status Lifecycle

- **Proposed** - Under discussion
- **Accepted** - Approved and in effect
- **Deprecated** - No longer applies but kept for historical reference
- **Superseded** - Replaced by a newer ADR (link to successor)
