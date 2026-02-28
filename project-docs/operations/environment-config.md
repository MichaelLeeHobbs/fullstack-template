# Environment Configuration

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Complete environment variable reference for all deployment environments.

---

## Overview

All environment variables are validated at startup using a Zod v4 schema defined in `apps/api/src/config/index.ts`. If any required variable is missing or invalid, the application exits immediately with a descriptive error. Feature flags and runtime configuration are stored in the database (`system_settings` table) and managed through the Admin UI.

---

## Configuration Schema

The application loads environment variables from two locations (in order):
1. `../../.env` (monorepo root)
2. `.env` (apps/api directory, fallback)

Variables are parsed and validated by a Zod schema that coerces types and applies defaults where appropriate.

---

## Environment Variables Reference

### Application

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NODE_ENV` | Runtime environment | No | `development` | `production` |
| `PORT` | HTTP server port | No | `3000` | `8080` |
| `FRONTEND_URL` | Frontend origin for CORS | No | `http://localhost:5173` | `https://app.example.com` |
| `TRUST_PROXY` | Proxy trust setting for rate limiting | No | `false` | `true`, `1`, `loopback` |

### Database

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | -- | `postgresql://app:app_dev@localhost:5433/app` |
| `DATABASE_SSL` | Enable SSL for database connection | No | `false` | `true` |

### Authentication

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) | **Yes** | -- | `your-super-secret-jwt-key-at-least-32-chars` |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | No | `15m` | `30m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | No | `7d` | `30d` |

### Encryption

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `ENCRYPTION_KEY` | Key for encrypting secrets at rest (min 32 chars) | No | Falls back to `JWT_SECRET` | `a-separate-32-char-encryption-key-here` |

### Logging

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `LOG_LEVEL` | Pino log level | No | `info` | `debug`, `warn`, `error` |

### S3 / MinIO (Object Storage)

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `S3_ENDPOINT` | S3-compatible endpoint URL | **Yes** | -- | `http://localhost:9000` |
| `S3_ACCESS_KEY` | S3 access key | **Yes** | -- | `app` |
| `S3_SECRET_KEY` | S3 secret key | **Yes** | -- | `app_dev_password` |
| `S3_BUCKET` | Default bucket name | **Yes** | -- | `app-uploads` |
| `S3_REGION` | S3 region | No | `us-east-1` | `eu-west-1` |

### Email

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `EMAIL_PROVIDER` | Email backend (`mock`, `smtp`, `ses`) | No | `mock` | `smtp` |
| `EMAIL_FROM` | Sender email address | No | -- | `noreply@app.example.com` |

#### SMTP Configuration (when `EMAIL_PROVIDER=smtp`)

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `SMTP_HOST` | SMTP server hostname | Conditional | -- | `smtp.mailgun.org` |
| `SMTP_PORT` | SMTP server port | Conditional | -- | `587` |
| `SMTP_USER` | SMTP username | Conditional | -- | `postmaster@mg.example.com` |
| `SMTP_PASS` | SMTP password | Conditional | -- | `key-xxx` |
| `SMTP_SECURE` | Use TLS | No | `true` | `false` |

#### AWS SES Configuration (when `EMAIL_PROVIDER=ses`)

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `AWS_SES_REGION` | AWS SES region | Conditional | -- | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | Conditional | -- | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Conditional | -- | `wJalrXUtnFEMI/K7MDENG/...` |

### Monitoring

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `SENTRY_DSN` | Sentry DSN for error tracking | No | -- | `https://abc@o123.ingest.sentry.io/456` |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry performance sampling rate | No | `0.1` | `1.0` |

### PKI / Certificate Login

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `TRUSTED_PROXY_IP` | IP of trusted proxy for mTLS header validation | No | -- | `10.0.0.1` |

---

## Per-Environment Configuration

### Development

```bash
# .env (monorepo root)
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://app:app_dev@localhost:5433/app
DATABASE_SSL=false
JWT_SECRET=dev-secret-key-must-be-at-least-32-characters-long
LOG_LEVEL=debug
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=app
S3_SECRET_KEY=app_dev_password
S3_BUCKET=app-uploads
EMAIL_PROVIDER=mock
TRUST_PROXY=false
```

**Notes:**
- `EMAIL_PROVIDER=mock` logs emails instead of sending them
- Docker Compose maps PostgreSQL to port `5433` on the host (internal port `5432`)
- MinIO console available at `http://localhost:9001`
- `LOG_LEVEL=debug` enables verbose output with pino-pretty formatting

### Staging

```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://staging.app.example.com
DATABASE_URL=postgresql://app:staging_pw@staging-db:5432/app
DATABASE_SSL=true
JWT_SECRET=<generated-staging-secret-64-chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=<generated-staging-encryption-key-64-chars>
LOG_LEVEL=info
S3_ENDPOINT=https://staging-s3.example.com
S3_ACCESS_KEY=staging-access-key
S3_SECRET_KEY=staging-secret-key
S3_BUCKET=staging-app-uploads
S3_REGION=us-east-1
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@staging.app.example.com
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@staging.mg.example.com
SMTP_PASS=<smtp-password>
SMTP_SECURE=true
TRUST_PROXY=1
SENTRY_DSN=https://abc@o123.ingest.sentry.io/staging
SENTRY_TRACES_SAMPLE_RATE=0.5
```

**Notes:**
- `DATABASE_SSL=true` required for all non-local connections
- `TRUST_PROXY=1` when behind a single reverse proxy
- Stricter CORS with specific staging domain
- Sentry enabled with higher sampling rate for debugging

### Production

```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://app.example.com
DATABASE_URL=<from-vault-or-cloud-secret>
DATABASE_SSL=true
JWT_SECRET=<from-vault-or-cloud-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=<from-vault-or-cloud-secret>
LOG_LEVEL=warn
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=<from-vault-or-cloud-secret>
S3_SECRET_KEY=<from-vault-or-cloud-secret>
S3_BUCKET=prod-app-uploads
S3_REGION=us-east-1
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@app.example.com
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from-vault-or-cloud-secret>
AWS_SECRET_ACCESS_KEY=<from-vault-or-cloud-secret>
TRUST_PROXY=1
SENTRY_DSN=https://abc@o123.ingest.sentry.io/prod
SENTRY_TRACES_SAMPLE_RATE=0.1
TRUSTED_PROXY_IP=<nginx-or-lb-ip>
```

**Notes:**
- All secrets sourced from a vault (AWS Secrets Manager, HashiCorp Vault, etc.)
- `LOG_LEVEL=warn` to reduce log volume; use `info` if more visibility is needed
- `ENCRYPTION_KEY` should be different from `JWT_SECRET`
- `TRUSTED_PROXY_IP` set when using NGINX for mTLS termination

---

## Secret Management Best Practices

### Development
- Use `.env` files (gitignored)
- Default credentials in Docker Compose are fine for local development
- Never commit `.env` files to version control

### Staging / Production
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
- Inject secrets via environment variables at runtime
- Rotate secrets on a regular schedule (quarterly minimum)
- Use separate secrets per environment -- never share between staging and production
- `JWT_SECRET` and `ENCRYPTION_KEY` should be cryptographically random, at least 64 characters

### Key Rotation Procedure

1. Generate a new secret value
2. Update the secret in your vault/secrets manager
3. Perform a rolling restart of application instances
4. For `JWT_SECRET` rotation: existing access tokens (15-minute TTL) will expire naturally; refresh tokens will require re-authentication
5. For `ENCRYPTION_KEY` rotation: requires a data migration to re-encrypt stored secrets with the new key

---

## Validation Failures

If the Zod schema validation fails at startup, the application exits with code `1` and prints a detailed error:

```
Invalid environment configuration:
  - DATABASE_URL: Required
  - JWT_SECRET: String must contain at least 32 character(s)
```

This is intentional -- the application should not run with invalid configuration. Fix the environment variables and restart.

---

## Docker Compose Defaults

The `docker-compose.yml` provides these services for local development:

| Service | Container | Port (Host) | Port (Internal) | Credentials |
|---------|-----------|-------------|-----------------|-------------|
| PostgreSQL 17 | `app-db` | `5433` | `5432` | `app` / `app_dev` |
| MinIO | `app-minio` | `9000` (API), `9001` (Console) | `9000`, `9001` | `app` / `app_dev_password` |
| API | `app-api` | `3000` | `3000` | Via `.env` |

---

## Related Documentation

- [Deployment Guide](./deployment.md) - Deployment procedures
- [Production Checklist](./production-checklist.md) - Pre-launch verification
- [Data Protection](../security/data-protection.md) - Encryption and secret handling
