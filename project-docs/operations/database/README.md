# Database Operations

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Migration workflows, backup procedures, and seed data reference for PostgreSQL 17 with Drizzle ORM.

---

## Overview

The application uses PostgreSQL 17 with Drizzle ORM for schema management, migrations, and queries. All schema definitions live in `apps/api/src/db/schema/` and are exported through a central index file. The database is provisioned via Docker Compose for local development and should use a managed service (RDS, Cloud SQL, etc.) in production.

**Connection (development):** `postgresql://app:app_dev@localhost:5433/app`

---

## Quick Reference

```bash
pnpm db:generate      # Generate migration after schema change (runs build first)
pnpm db:migrate       # Apply pending migrations
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:seed          # Seed default data (idempotent)
pnpm docker:up        # Start PostgreSQL and MinIO
pnpm docker:down      # Stop Docker services
pnpm docker:reset     # Stop and delete all data volumes
```

---

## Sections

### Migrations

> [`migrations.md`](./migrations.md)

Complete migration workflow with Drizzle ORM:
- Schema change process
- Migration generation and application
- Rollback strategies
- Zero-downtime migration practices
- Drizzle syntax conventions

---

### Backup & Restore

> [`backup-restore.md`](./backup-restore.md)

Database backup and recovery procedures:
- Logical backups with `pg_dump`
- Automated backup schedules
- Point-in-time recovery with WAL archiving
- Restore procedures
- Backup testing and verification
- S3 backup storage

---

### Seed Data

> [`seed-data.md`](./seed-data.md)

Default seed data reference:
- Seed script overview (`pnpm db:seed`)
- Default admin credentials
- Seeded permissions, roles, and settings
- Certificate profiles
- Custom seed data instructions

---

## Schema Overview

The database schema consists of the following tables (defined in `apps/api/src/db/schema/`):

| Schema File | Tables | Description |
|-------------|--------|-------------|
| `users.ts` | `users` | User accounts (human and service) |
| `sessions.ts` | `sessions` | Active refresh token sessions |
| `settings.ts` | `system_settings` | Runtime configuration and feature flags |
| `tokens.ts` | `email_verification_tokens` | Email verification and password reset tokens |
| `audit.ts` | `audit_logs` | Application audit trail |
| `permissions.ts` | `permissions` | Granular permission definitions |
| `roles.ts` | `roles`, `role_permissions` | Role definitions and permission assignments |
| `user-roles.ts` | `user_roles` | User-to-role assignments |
| `api-keys.ts` | `api_keys`, `api_key_permissions` | API key storage and permissions |
| `user-mfa-methods.ts` | `user_mfa_methods` | MFA method configuration per user |
| `notifications.ts` | `notifications` | In-app notification storage |
| `pki-private-keys.ts` | `pki_private_keys` | Encrypted CA/certificate private keys |
| `certificate-authorities.ts` | `certificate_authorities` | CA hierarchy |
| `certificate-profiles.ts` | `certificate_profiles` | Certificate issuance profiles |
| `certificates.ts` | `certificates` | Issued certificates |
| `certificate-requests.ts` | `certificate_requests` | CSR queue |
| `revocations.ts` | `revocations` | Certificate revocation records |
| `crls.ts` | `crls` | Certificate revocation lists |
| `user-certificates.ts` | `user_certificates` | User-to-certificate bindings |
| `cert-attach-codes.ts` | `cert_attach_codes` | One-time codes for certificate attachment |
| `pki-audit-logs.ts` | `pki_audit_logs` | PKI-specific audit trail |

---

## Docker Compose Database

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: app-db
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app_dev
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**Note:** The host port is `5433` (not `5432`) to avoid conflicts with any local PostgreSQL installation.

---

## Related Documentation

- [Environment Configuration](../environment-config.md) - DATABASE_URL and DATABASE_SSL settings
- [Data Protection](../../security/data-protection.md) - Database encryption and credential management
- [Deployment Guide](../deployment.md) - Production database setup
