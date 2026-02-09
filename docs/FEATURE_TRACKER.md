# Feature Tracker

> Last Updated: 2026-02-09
> Source: Codebase survey + PROJECT_AUDIT_REPORT.md

**Status Key:**

| Status | Meaning |
|--------|---------|
| Complete | Fully implemented and working |
| Partial | Implemented but has known gaps or limitations |
| Planned | On the roadmap, not yet started |
| Not Planned | Explicitly out of scope for this template |

---

## 1. Project Infrastructure

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1 | pnpm monorepo | Complete | 3 packages: `apps/api`, `apps/web`, `packages/shared` |
| 1.2 | TypeScript | Complete | TS 5.x across all packages |
| 1.3 | ESLint | Complete | Flat config (`eslint.config.js`) |
| 1.4 | Prettier | Complete | Consistent formatting |
| 1.5 | Docker Compose | Complete | PostgreSQL 17 + MinIO |
| 1.6 | Dockerfile | Complete | Multi-stage Node 20 Alpine build |
| 1.7 | GitHub Actions CI | Complete | Lint, build, test on push/PR |
| 1.8 | Environment config | Complete | Zod-validated env vars at startup |
| 1.9 | `.env.example` | Complete | Matches config schema |
| 1.10 | Engine enforcement | Complete | `.npmrc` with `engine-strict` |

---

## 2. Authentication

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1 | Email/password registration | Complete | Zod-validated, bcrypt 12 rounds |
| 2.2 | Login / Logout | Complete | JWT access + refresh tokens |
| 2.3 | JWT token type discrimination | Complete | `type` claim (`access`, `refresh`, `mfa`) validated per-endpoint |
| 2.4 | Refresh token rotation | Complete | Old token invalidated on refresh |
| 2.5 | Refresh token hashing | Complete | SHA-256 hashed before DB storage |
| 2.6 | httpOnly cookie refresh tokens | Complete | Moved from localStorage to httpOnly cookies |
| 2.7 | Token refresh mutex (frontend) | Complete | Concurrent 401s queue behind single refresh |
| 2.8 | Password reset flow | Complete | Token-based email reset |
| 2.9 | Email verification | Complete | Token-based email verification |
| 2.10 | Account lockout | Complete | Progressive lockout after failed attempts |
| 2.11 | Session management | Complete | View/revoke active sessions |
| 2.12 | Session invalidation on password change | Complete | All sessions cleared on password reset/change |
| 2.13 | MFA / TOTP | Complete | Setup, verify, disable, backup codes |
| 2.14 | TOTP secret encryption | Complete | AES-256-GCM at rest |
| 2.15 | NIST 800-63B password policy | Complete | Min 8 / max 128 chars, no composition rules |
| 2.16 | Social OAuth (Google) | Planned | Expected baseline for SaaS |
| 2.17 | Social OAuth (GitHub) | Planned | Expected baseline for SaaS |
| 2.18 | Magic link / passwordless | Planned | Increasingly expected |
| 2.19 | Passkey / WebAuthn | Not Planned | |

---

## 3. User Management

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.1 | User profile CRUD | Complete | Name, email, avatar |
| 3.2 | User preferences | Complete | Timezone, date format, notifications |
| 3.3 | Admin user management | Complete | List, search, filter, pagination |
| 3.4 | Admin user detail/edit | Complete | Activate, deactivate, change role |
| 3.5 | Service accounts | Complete | Headless accounts for API access |

---

## 4. Authorization & Access Control

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 4.1 | Role-Based Access Control (RBAC) | Complete | Roles with granular permissions |
| 4.2 | Permission middleware | Complete | Route-level permission checks |
| 4.3 | Permission caching | Complete | In-memory cache, 5 min TTL |
| 4.4 | API key management | Complete | Scoped, revocable, SHA-256 hashed |
| 4.5 | API key authentication middleware | Complete | `X-API-Key` header |
| 4.6 | Admin route protection | Complete | Frontend `AdminRoute` + backend middleware |
| 4.7 | Protected route with redirect | Complete | Saves intended destination |

---

## 5. API & Backend

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5.1 | Express 4.x server | Complete | 4-layer pattern: Router → Controller → Service → Model |
| 5.2 | Result pattern (stderr-lib) | Complete | Services return `Result<T>`, never throw |
| 5.3 | ServiceError typed errors | Complete | Error codes (`NOT_FOUND`, `FORBIDDEN`, etc.) replace string matching |
| 5.4 | Zod v4 request validation | Complete | Middleware-layer validation with `prettifyError` |
| 5.5 | OpenAPI / Swagger docs | Complete | Available at `/api/docs` |
| 5.6 | Rate limiting (auth endpoints) | Complete | Tiered per-endpoint limits |
| 5.7 | Global API rate limiter | Complete | Applied to all routes |
| 5.8 | Response compression | Complete | gzip + brotli |
| 5.9 | HTTP caching headers | Complete | Cache middleware |
| 5.10 | Request ID tracking | Complete | Per-request correlation IDs |
| 5.11 | Pagination / filtering / sorting | Complete | Standardized across list endpoints |
| 5.12 | Security headers (Helmet) | Complete | Default Helmet config |
| 5.13 | CORS configuration | Complete | `FRONTEND_URL`-based origin |
| 5.14 | `trust proxy` configuration | Complete | For reverse proxy deployments |
| 5.15 | Graceful shutdown | Complete | SIGTERM/SIGINT handlers |
| 5.16 | Health endpoint | Complete | `GET /health` |
| 5.17 | JSON body limit | Complete | Reduced to 1 MB |
| 5.18 | Maintenance mode middleware | Complete | Reads `app.maintenance_mode` setting |
| 5.19 | GraphQL | Not Planned | REST-only template |

---

## 6. Database

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 6.1 | PostgreSQL 17 | Complete | Via Docker Compose |
| 6.2 | Drizzle ORM | Complete | Type-safe queries, migrations |
| 6.3 | Migration system | Complete | `pnpm db:generate` / `db:migrate` |
| 6.4 | Seed script | Complete | Transaction-wrapped, idempotent |
| 6.5 | Drizzle Studio | Complete | `pnpm db:studio` GUI |
| 6.6 | Database SSL (production) | Complete | Configurable SSL option |
| 6.7 | Timezone-aware timestamps | Complete | `timestamp({ withTimezone: true })` |
| 6.8 | `updatedAt` auto-trigger | Complete | PostgreSQL `BEFORE UPDATE` trigger |
| 6.9 | Database indexes | Complete | Audit logs, sessions, composite unique on permissions |
| 6.10 | Reversible migrations (DOWN) | Not Planned | Drizzle ORM has no built-in support; not worth custom tooling |
| 6.11 | N+1 query optimization | Complete | JOIN queries replace loop patterns |

**Schema tables:** users, sessions, tokens, user_mfa_methods, roles, permissions, user_roles, api_keys, audit_logs, notifications, settings

---

## 7. Frontend Core

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 7.1 | React 18 + Vite | Complete | Fast dev server + HMR |
| 7.2 | Material UI 6 | Complete | Component library |
| 7.3 | React Router | Complete | Client-side routing |
| 7.4 | Zustand state management | Complete | Auth, theme, socket, notification stores |
| 7.5 | TanStack Query | Complete | Server state + caching |
| 7.6 | Dark mode (system/light/dark) | Complete | Three-way toggle, persisted |
| 7.7 | App layout (sidebar + topnav) | Complete | Responsive layout |
| 7.8 | Landing page | Complete | Public marketing page |
| 7.9 | Error boundary | Complete | Route-level error handling with recovery |
| 7.10 | Loading states | Complete | Spinner component |
| 7.11 | Toast notifications (notistack) | Complete | Snackbar notifications |
| 7.12 | Code splitting / lazy routes | Complete | Admin bundle not loaded for non-admins |
| 7.13 | Debounced search | Complete | `useDebouncedValue` hook |
| 7.14 | Accessibility (aria labels) | Complete | Interactive elements labeled |

**Pages:** Landing, Login, Register, Forgot Password, Reset Password, Verify Email, Home, Profile, Sessions, 404
**Admin pages:** Users, Roles, API Keys, Service Accounts, Audit Logs, Settings

---

## 8. Real-time & Notifications

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 8.1 | Socket.IO server | Complete | Authenticated WebSocket connections |
| 8.2 | Socket.IO authentication middleware | Complete | JWT-verified socket connections |
| 8.3 | Notifications namespace | Complete | `/notifications` namespace, user-specific rooms |
| 8.4 | In-app notification service | Complete | CRUD + real-time push via Socket.IO |
| 8.5 | Notification bell UI | Complete | Badge with unread count |
| 8.6 | Notification dropdown menu | Complete | Mark read, mark all read, delete |
| 8.7 | Real-time notification delivery | Complete | `notification:new`, `notification:count_update` events |
| 8.8 | Frontend socket hooks | Complete | `useSocket`, `useSocketEvent`, `useNotifications` |

---

## 9. Background Jobs

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 9.1 | Job queue (pg-boss) | Complete | PostgreSQL-backed, no Redis required |
| 9.2 | Email delivery jobs | Complete | Async email sending |
| 9.3 | Notification delivery jobs | Complete | Async notification creation |
| 9.4 | Expired data cleanup job | Complete | Hourly: sessions, tokens, old notifications |
| 9.5 | Type-safe job enqueue helper | Complete | Centralized `enqueue()` function |

---

## 10. Email & Communication

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 10.1 | Email service facade | Complete | Provider pattern with factory |
| 10.2 | Mock email provider | Complete | Console logging for development |
| 10.3 | SMTP provider | Complete | Nodemailer transport |
| 10.4 | AWS SES provider | Complete | Production email delivery |
| 10.5 | Email verification emails | Complete | Token-based, HTML template |
| 10.6 | Password reset emails | Complete | Token-based, HTML template |
| 10.7 | Email HTML escaping | Complete | Safe interpolation in templates |
| 10.8 | Outbound webhooks | Planned | Standard SaaS integration pattern |

---

## 11. Storage & Files

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 11.1 | S3-compatible storage service | Complete | AWS S3 or MinIO backend |
| 11.2 | MinIO (dev) | Complete | Docker Compose service, ports 9000/9001 |
| 11.3 | File upload pipeline (presigned URLs) | Planned | S3/MinIO infrastructure exists, needs upload endpoints + UI |
| 11.4 | Avatar upload | Planned | Profile page ready, needs upload component |

---

## 12. Observability & Audit

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 12.1 | Pino structured logging | Complete | JSON logging, never console.log |
| 12.2 | pino-http request logging | Complete | Auto-logs HTTP requests |
| 12.3 | Request ID correlation | Complete | Traces request across services |
| 12.4 | Audit logging service | Complete | Security event logging |
| 12.5 | Audit log events | Complete | Login, password change, session, MFA events |
| 12.6 | Audit log admin UI | Complete | Filterable audit log viewer |
| 12.7 | Sentry error tracking | Planned | Frontend + backend integration |

---

## 13. Testing

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 13.1 | Vitest framework | Complete | Both API and web packages |
| 13.2 | Unit tests (backend services) | Complete | All 17 services have unit tests |
| 13.3 | Unit tests (backend controllers) | Complete | All 10 controllers tested |
| 13.4 | Integration tests (API) | Complete | Auth + admin flows with supertest |
| 13.5 | Unit tests (frontend components) | Partial | Limited component test coverage |
| 13.6 | Test utilities | Complete | Mock DB, mock Express, data factories in `test/utils/` |
| 13.7 | E2E tests (Playwright) | Planned | Browser-level testing |
| 13.8 | Test count | — | 342 API + 11 web tests passing |

---

## 14. Documentation

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 14.1 | Architecture docs | Complete | Core patterns, coding standard, data model |
| 14.2 | Getting started guide | Complete | `GETTING_STARTED.md` |
| 14.3 | Deployment guide | Complete | `DEPLOYMENT.md` |
| 14.4 | Production checklist | Complete | `PRODUCTION_CHECKLIST.md` |
| 14.5 | API reference (Swagger) | Complete | Live at `/api/docs` |
| 14.6 | Feature docs | Complete | Per-feature markdown specs |
| 14.7 | AI agent instructions | Complete | `AI_README.md` + `CLAUDE.md` |
| 14.8 | Permission reference | Complete | `PERMISSIONS.md` |
| 14.9 | Config reference | Complete | `CONFIG.md` |
| 14.10 | Audit report | Complete | `PROJECT_AUDIT_REPORT.md` — all bug/quality items resolved |

---

## 15. Advanced / SaaS Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 15.1 | Stripe billing / subscriptions | Planned | #1 differentiator for SaaS templates |
| 15.2 | Multi-tenancy (teams/orgs) | Planned | Critical for B2B SaaS |
| 15.3 | i18n / internationalization | Planned | Should be added early — painful to retrofit |
| 15.4 | Feature flags (advanced) | Partial | DB-backed flags exist; needs user targeting + percentage rollout |
| 15.5 | Full-text search | Planned | PostgreSQL FTS, no extra infrastructure |
| 15.6 | AI integration patterns | Planned | LLM wrapper + streaming |
| 15.7 | Admin dashboard analytics | Planned | Charts/metrics for admin |

---

## 16. System Settings & Feature Flags

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 16.1 | Settings service with caching | Complete | 1 min TTL |
| 16.2 | Admin settings UI | Complete | View/edit all settings |
| 16.3 | `feature.registration_enabled` | Complete | Checked at registration |
| 16.4 | `feature.email_verification_required` | Complete | Checked at login |
| 16.5 | `app.maintenance_mode` | Complete | Middleware reads and enforces |

---

## Summary

| Category | Complete | Partial | Planned | Not Planned | Total |
|----------|----------|---------|---------|-------------|-------|
| Infrastructure | 10 | 0 | 0 | 0 | 10 |
| Authentication | 15 | 0 | 3 | 1 | 19 |
| User Management | 5 | 0 | 0 | 0 | 5 |
| Authorization | 7 | 0 | 0 | 0 | 7 |
| API & Backend | 18 | 0 | 0 | 1 | 19 |
| Database | 10 | 0 | 0 | 1 | 11 |
| Frontend Core | 14 | 0 | 0 | 0 | 14 |
| Real-time & Notifications | 8 | 0 | 0 | 0 | 8 |
| Background Jobs | 5 | 0 | 0 | 0 | 5 |
| Email & Communication | 7 | 0 | 1 | 0 | 8 |
| Storage & Files | 2 | 0 | 2 | 0 | 4 |
| Observability & Audit | 6 | 0 | 1 | 0 | 7 |
| Testing | 4 | 2 | 1 | 0 | 7 |
| Documentation | 10 | 0 | 0 | 0 | 10 |
| Advanced / SaaS | 0 | 1 | 6 | 0 | 7 |
| Settings & Flags | 5 | 0 | 0 | 0 | 5 |
| **Total** | **126** | **3** | **14** | **3** | **146** |

**Completion: 86% complete, 2% partial, 10% planned, 2% not planned**
