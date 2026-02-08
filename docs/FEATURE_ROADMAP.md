# Feature Roadmap

Tracking document for fullstack template features. Updated based on comprehensive audit.

---

## Legend

- [x] Complete
- [ ] Not started
- [~] Partial / In progress

---

## 1. Authentication & Authorization

### Core Auth
- [x] User registration (email/password)
- [x] Login with JWT access tokens + refresh tokens
- [x] Token refresh with session rotation
- [x] Logout with token invalidation
- [x] Password hashing (bcrypt, 12 rounds)
- [x] Auth middleware (JWT verification)
- [x] Optional auth middleware
- [x] `/api/v1/auth/me` endpoint
- [x] Rate limiting on login (5/15min)
- [x] Rate limiting on registration (5/hr)

### Email Flows
- [x] Email verification schema
- [x] Email verification endpoints
- [x] Email verification enforced on login
- [x] Password reset schema
- [x] Password reset endpoints
- [x] Frontend: Verify email page
- [x] Frontend: Forgot password page
- [x] Frontend: Reset password page

### RBAC
- [x] Permissions table (resource:action format)
- [x] Roles table with isSystem flag
- [x] Role-permission mapping
- [x] User-role mapping
- [x] Permission middleware (single/multiple)
- [x] Admin middleware
- [x] Permission caching (5min TTL)
- [x] Audit logging for sensitive actions

### Future Auth (Not Planned)
- [ ] Two-factor authentication (2FA)
- [ ] Social login (Google, GitHub)
- [ ] Session management UI
- [ ] Account lockout after failed attempts

---

## 2. API Layer

### Implemented
- [x] Consistent response format `{ success, data?, error? }`
- [x] Result pattern with stderr-lib `tryCatch()`
- [x] Zod v4 input validation
- [x] HTTP status codes (201, 400, 401, 403, 404, 500)
- [x] Error handling middleware
- [x] Not found handler (404)
- [x] Environment-based error detail hiding
- [x] Pino logging (pino-http, skips /health)
- [x] Rate limiting (auth, registration, password reset, general API)

### Missing - High Priority
- [ ] OpenAPI/Swagger documentation
- [ ] Request ID tracking (X-Request-ID)
- [ ] Pagination helpers
- [ ] Filtering/sorting utilities

### Missing - Low Priority
- [ ] HTTP caching headers (ETag, Cache-Control)
- [ ] Compression middleware
- [ ] Request validation middleware (per-route)

---

## 3. Database

### Implemented
- [x] PostgreSQL with Drizzle ORM
- [x] 9 tables with proper foreign keys
- [x] UUID primary keys
- [x] Timestamps (createdAt, updatedAt)
- [x] Drizzle migrations
- [x] Database seeding (idempotent)

### Schema Tables
- [x] users (with preferences JSONB)
- [x] sessions (refresh tokens)
- [x] emailVerificationTokens
- [x] passwordResetTokens
- [x] roles
- [x] rolePermissions
- [x] userRoles
- [x] permissions
- [x] auditLogs
- [x] systemSettings

### Missing
- [ ] Connection pooling documentation
- [ ] Transaction patterns documentation
- [ ] Index optimization
- [ ] Soft delete pattern (if needed)

---

## 4. Services

### Implemented
- [x] AuthService - register, login, refresh, logout
- [x] UserService - profile, password change, preferences
- [x] AdminService - user management, audit logs
- [x] PermissionService - permission checks, caching
- [x] RoleService - CRUD roles, role permissions
- [x] UserRoleService - assign/revoke roles
- [x] SettingsService - system settings
- [x] AuditService - security event logging
- [x] AccountService - email verification, password reset
- [x] EmailService - multi-provider (mock/SMTP/SES)
- [x] StorageService - S3/MinIO integration

### Missing (Future)
- [ ] NotificationService (push, SMS)
- [ ] SearchService (full-text)
- [ ] QueueService (background jobs)

---

## 5. Email Providers

### Implemented
- [x] Provider interface pattern
- [x] Mock provider (development)
- [x] SMTP provider (nodemailer)
- [x] SES provider (AWS SDK)
- [x] Factory with fallback to mock
- [x] Lazy initialization
- [x] Connection testing

### Configuration
```bash
EMAIL_PROVIDER=mock|smtp|ses
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
AWS_SES_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
EMAIL_FROM
```

---

## 6. Frontend

### Routing
- [x] React Router v6
- [x] Public routes (/, /login, /register)
- [x] Protected routes (/home, /profile)
- [x] Admin routes (/admin/*)
- [x] ProtectedRoute component
- [x] AdminRoute component
- [x] Intended destination tracking
- [x] 404 catchall
- [x] Email verification routes
- [x] Password reset routes

### State Management
- [x] Zustand auth store
- [x] Zustand theme store
- [x] localStorage persistence
- [x] Permission state

### API Client
- [x] Custom apiFetch with auto token refresh
- [x] 401 retry with new token
- [x] Session expiration detection
- [x] Typed fetch helpers (get, post, put, patch, delete)
- [x] ApiError class
- [x] Auth API client
- [x] User API client
- [x] Admin API client
- [x] Roles API client
- [x] Account API client

### Components
- [x] Material-UI v6 theming (light/dark)
- [x] AppLayout (with sidebar)
- [x] PublicLayout (landing)
- [x] Header/TopNav
- [x] Sidebar
- [x] Footer
- [x] ThemeToggle
- [x] LoadingSpinner
- [x] ErrorBoundary
- [x] Notistack toasts

### Pages
- [x] LandingPage
- [x] LoginPage
- [x] RegisterPage
- [x] HomePage (dashboard)
- [x] ProfilePage
- [x] AdminUsersPage
- [x] AdminRolesPage
- [x] AdminSettingsPage
- [x] AdminAuditLogsPage
- [x] ForgotPasswordPage
- [x] ResetPasswordPage
- [x] VerifyEmailPage

### Missing - High Priority
- [x] Form library (react-hook-form + Zod)
- [ ] Permission-based route guards (beyond admin)

### Data Tables (Future Decision)
Options when needed:
- **MUI X Data Grid** - Fits with existing MUI stack, some features need Pro license
- **AG Grid** - Very powerful, some features need license, complex API
- **TanStack Table** - Headless (no styles), requires custom UI work
- **react-data-table-component** - Simple, may lack advanced features

### Already Available via MUI
- [x] Modal dialogs (MUI Dialog component)
- [x] Confirm dialogs (Dialog + DialogActions)
- [x] Toast notifications (notistack)
- [x] Skeleton loaders (MUI Skeleton)

### Missing - Low Priority
- [ ] Lazy loading (code splitting)
- [ ] Storybook

---

## 7. Infrastructure

### Docker
- [x] docker-compose.yml
- [x] PostgreSQL 17 service
- [x] MinIO service
- [x] Health checks
- [x] Named volumes
- [x] Network isolation

### Environment
- [x] .env.example documented
- [x] Zod schema validation on startup
- [x] All required variables documented

### Missing - High Priority
- [ ] GitHub Actions CI/CD
- [ ] Dockerfile for API
- [ ] Dockerfile for web
- [ ] Production docker-compose

### Missing - Low Priority
- [ ] Kubernetes manifests
- [ ] Terraform/IaC
- [ ] Deployment documentation

---

## 8. Security

### Implemented
- [x] Helmet security headers
- [x] CORS configuration
- [x] Rate limiting
- [x] Password hashing (bcrypt)
- [x] JWT secret configuration
- [x] Environment variables for secrets
- [x] Input validation (Zod)
- [x] Account deactivation check
- [x] Permission-based access control
- [x] Audit logging
- [x] Error detail hiding in production

### Missing
- [ ] CSRF protection (if needed for forms)
- [ ] API key authentication (alternative to JWT)
- [ ] Suspicious activity detection
- [ ] IP whitelisting/blacklisting

---

## 9. Health & Monitoring

### Implemented
- [x] `/health` endpoint
- [x] Basic status response

### Missing - High Priority
- [ ] Database connectivity check
- [ ] Detailed health status

### Missing - Low Priority
- [ ] Kubernetes probes
- [ ] Performance monitoring
- [ ] Analytics integration

---

## 10. Testing

### Implemented
- [x] Vitest framework
- [x] JWT tests
- [x] Admin middleware tests
- [x] Auth schema tests
- [x] Account service tests
- [x] Audit service tests
- [x] Email service tests
- [x] Storage service tests
- [x] Auth store tests
- [x] Theme store tests

### Missing - High Priority
- [ ] Auth service tests
- [ ] Controller tests
- [ ] Integration tests

### Missing - Low Priority
- [ ] E2E tests (Playwright)
- [ ] Load testing
- [ ] Accessibility testing

---

## 11. Documentation

### Implemented
- [x] docs/README.md
- [x] docs/GETTING_STARTED.md
- [x] docs/AI_README.md
- [x] docs/architecture/CORE_PATTERNS.md
- [x] docs/architecture/CODING_STANDARD.md
- [x] docs/architecture/CONFIG.md
- [x] docs/architecture/DATA_MODEL.md
- [x] docs/architecture/DEV_ENVIRONMENT.md
- [x] docs/architecture/PERMISSIONS.md
- [x] docs/architecture/TECH_STACK.md
- [x] docs/features/_MVP_SCOPE.md
- [x] CLAUDE.md (AI instructions)

### Missing - High Priority
- [ ] API endpoint reference
- [ ] OpenAPI/Swagger spec

### Missing - Low Priority
- [ ] Database schema diagram
- [ ] Deployment guide
- [ ] Production checklist

---

## Priority Order for Next Features

### Immediate (High Value)
1. ~~Form library integration (react-hook-form + zod)~~ DONE
2. GitHub Actions CI (lint, test, build)
3. OpenAPI/Swagger documentation

### Soon (Medium Value)
4. Request ID tracking
5. Pagination utilities
6. Enhanced health checks
7. More comprehensive tests

### Later (Nice to Have)
8. Dockerfiles for production
9. E2E tests
10. Background job queue
11. 2FA support
12. Data table (choose library when needed)
