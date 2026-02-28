# Production Checklist

> Pre-launch checklist for deploying the fullstack template to production.

---

## Security

- [ ] `NODE_ENV=production` (disables Swagger UI, verbose errors, and pretty logging)
- [ ] `JWT_SECRET` is a strong random value (min 32 chars — generate with `openssl rand -base64 48`)
- [ ] CORS `FRONTEND_URL` is set to the production domain (not `*`)
- [ ] Database password is not the default `app_dev`
- [ ] S3 credentials are scoped to the application bucket only
- [ ] HTTPS enforced (SSL termination at load balancer or reverse proxy)
- [ ] Rate limiting is active on auth endpoints (`/auth/login`, `/auth/register`, `/account/forgot-password`)
- [ ] Helmet security headers are enabled (default in the Express middleware chain)
- [ ] API keys use hashed storage (`key_hash` column, never stored in plaintext)

## Database

- [ ] All migrations applied (`pnpm db:migrate`)
- [ ] Default roles, permissions, and settings seeded (`pnpm db:seed`)
- [ ] Connection pool size tuned for expected load (default: 10)
- [ ] SSL enabled for database connections (`?sslmode=require` in `DATABASE_URL`)
- [ ] Automated backups configured
- [ ] Tested restore from backup at least once

## Monitoring

- [ ] Health check endpoint (`GET /health`) monitored by uptime service
- [ ] Pino logs shipped to a log aggregation service (CloudWatch, Datadog, Grafana Loki, etc.)
- [ ] Error tracking configured (Sentry or similar)
- [ ] Database connection pool metrics monitored
- [ ] Disk space monitored (logs, uploads)

## Performance

- [ ] Frontend served from CDN with caching headers
- [ ] Gzip/Brotli compression enabled (via `compression` middleware — threshold 1KB)
- [ ] Database indexes applied (see [Data Model — Indexes](./architecture/DATA_MODEL.md#indexes))
- [ ] Static assets have cache-busting hashes (Vite does this by default)
- [ ] Weak ETags enabled for API responses

## Operations

- [ ] Admin user created with Super Admin role
- [ ] System settings reviewed and configured:
  - `feature.registration_enabled` — allow new sign-ups?
  - `feature.email_verification_required` — require email verification?
  - `app.maintenance_mode` — should be `false`
- [ ] Email sending configured and tested (SMTP or SES, not mock)
- [ ] S3 bucket created and accessible
- [ ] Graceful shutdown handles in-flight requests
- [ ] Log level set appropriately (`info` or `warn` for production, not `debug`)
