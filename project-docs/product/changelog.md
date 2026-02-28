# Changelog

> **[Template]** This covers the base template feature. Extend or modify for your project.

> All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- _Track new features here before the next release_

### Changed
- _Track modifications to existing features here_

### Deprecated
- _Track features marked for removal in future releases_

### Removed
- _Track features removed in this release_

### Fixed
- _Track bug fixes here_

### Security
- _Track security-related changes here_

---

## [1.0.0] - 2026-02-28

### Added

#### Infrastructure
- Express 4.x API server with TypeScript and ESM
- React 18 SPA with Vite and Material UI 6
- PostgreSQL 17 database with Drizzle ORM
- Docker Compose for local development (PostgreSQL + MinIO)
- pnpm monorepo with shared packages
- Pino structured logging (JSON in production, pretty in development)
- Request ID tracking across all log entries
- Zod v4 validation on all API endpoints
- Helmet security headers
- Compression middleware
- Health check endpoint (`GET /health`)
- Optional Sentry integration for error tracking and performance monitoring

#### Authentication & Authorization
- User registration with email/password
- Login with JWT access tokens (15-minute TTL) and refresh tokens (7-day TTL, httpOnly cookies)
- Refresh token rotation with SHA-256 hashing in database
- Account lockout after configurable failed attempts (default: 5 attempts, 15-minute lockout)
- Email verification flow with hashed tokens
- Password reset flow
- RBAC with granular permissions (35 permissions across 12 resources)
- 5 default roles: Super Admin, Admin, User, PKI Admin, PKI Operator
- System role protection (Super Admin cannot be deleted)
- Permission middleware on all protected routes

#### Multi-Factor Authentication
- TOTP setup with QR code generation
- TOTP verification during login
- 10 single-use backup codes (bcrypt-hashed)
- Encrypted TOTP secret storage (AES-256-GCM)

#### Session Management
- Database-backed sessions with user agent and IP tracking
- Multi-device session support
- Session listing and selective revocation
- Bulk session invalidation on password change

#### API Keys
- API key generation with SHA-256 hashed storage
- 8-character prefix for key identification
- Scoped permissions (subset of creating user's permissions)
- Optional expiration dates
- Per-key rate limiting (60 req/min)
- Instant revocation

#### Service Accounts
- Non-interactive accounts for automated access
- Dedicated permission assignments
- Audit logging of service account actions

#### PKI / CA Management
- Certificate Authority hierarchy (root and intermediate CAs)
- Certificate issuance with profiles (TLS Server, Client Auth, User Auth, Intermediate CA, S/MIME)
- Certificate signing request (CSR) workflow with approval
- Certificate revocation and CRL generation
- PKI private key encryption (AES-256-GCM + Argon2id KDF)
- Certificate-based login via mTLS (NGINX header validation)
- Certificate attachment codes for user binding
- Dedicated PKI audit trail
- 5 built-in certificate profiles

#### Admin Features
- User management (list, search, activate/deactivate, role assignment)
- Role management (create, edit, delete non-system roles, assign permissions)
- System settings management (runtime configuration, feature flags)
- Audit log viewer (search, filter by user/action)
- API key administration
- Notification management

#### Email
- Pluggable email provider (mock, SMTP, AWS SES)
- Email verification templates
- Password reset templates

#### Storage
- S3-compatible object storage (MinIO for development, S3 for production)
- File upload and download services

#### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- Registration: 5 requests per hour
- Password reset: 3 requests per hour
- General API: 100 requests per minute
- API key auth: 60 requests per minute

#### Frontend
- React 18 with TypeScript
- Material UI 6 component library
- TanStack Query for server state management
- Zustand for client state (auth, theme)
- Responsive layout with dark/light theme
- Admin dashboard

#### Testing
- Vitest test framework
- Unit tests for all services and controllers
- Test utilities (mock-db, mock-express, data factories)
- Integration test infrastructure

#### Documentation
- Architecture Decision Records (ADRs)
- C4 model diagrams
- API documentation
- Developer guides
- Operations documentation
- Security documentation

### Security
- bcrypt password hashing (12 rounds)
- AES-256-GCM encryption for PKI private keys with Argon2id KDF
- SHA-256 token hashing (refresh tokens, API keys, verification tokens)
- Encrypted MFA TOTP secrets
- httpOnly secure cookies for refresh tokens
- CORS restricted to configured frontend origin
- Rate limiting on all endpoints with stricter limits on auth
- Input validation with Zod v4 on every endpoint
- Helmet security headers (HSTS, CSP, X-Frame-Options, etc.)
- SSL header stripping to prevent mTLS spoofing
- Audit logging for all sensitive operations

---

## Maintaining This Changelog

### Format Guidelines

Each release should include a version number, date, and categorized changes:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in upcoming releases

### Removed
- Features removed in this release

### Fixed
- Bug fixes

### Security
- Vulnerability fixes and security improvements
```

### Rules

1. **Every user-facing change gets an entry.** Internal refactoring does not need an entry unless it affects behavior.
2. **Group related changes.** Multiple commits for one feature should be a single changelog entry.
3. **Write for humans.** Use clear, concise language describing what changed and why.
4. **Link to issues/PRs** when relevant: `Fixed login timeout (#123)`.
5. **Highlight breaking changes** with a `BREAKING:` prefix.
6. **Security fixes** always go in the Security section, even if they also fit elsewhere.

### Semantic Versioning

| Version Component | When to Increment |
|-------------------|-------------------|
| **Major** (X.0.0) | Breaking API changes, major architecture changes |
| **Minor** (0.X.0) | New features, non-breaking additions |
| **Patch** (0.0.X) | Bug fixes, security patches, documentation |

---

## Related Documentation

- [Feature Tracker](./feature-tracker.md) - Detailed feature implementation status
- [Roadmap](../project/roadmap.md) - Planned future features
- [Admin Guide](./admin-guide.md) - Feature usage documentation
