# Deployment Guide

> How to build, configure, and deploy the fullstack template to production.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | LTS recommended |
| pnpm | 9+ | Package manager |
| PostgreSQL | 17+ | Managed service or self-hosted |
| S3-compatible storage | - | AWS S3, MinIO, Cloudflare R2, etc. |
| SMTP server (optional) | - | AWS SES, SendGrid, or any SMTP relay |

---

## 1. Build

```bash
pnpm install --frozen-lockfile
pnpm build
```

Build outputs:
- **Backend:** `apps/api/dist/` (compiled TypeScript)
- **Frontend:** `apps/web/dist/` (static files — HTML, JS, CSS)

---

## 2. Environment Variables

Create a `.env` file or inject environment variables via your deployment platform. See [Configuration Reference](./architecture/CONFIG.md) for the full list.

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Must be `production` | `production` |
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | Strong random secret (min 32 chars) | `openssl rand -base64 48` |
| `FRONTEND_URL` | Production frontend URL (for CORS and email links) | `https://app.example.com` |
| `S3_ENDPOINT` | S3-compatible storage endpoint | `https://s3.amazonaws.com` |
| `S3_ACCESS_KEY` | Storage access key | - |
| `S3_SECRET_KEY` | Storage secret key | - |
| `S3_BUCKET` | Storage bucket name | `myapp-assets` |

### Differences from Development

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `JWT_SECRET` | `dev-secret...` | Strong random value |
| `DATABASE_URL` | `localhost:5432` no SSL | Remote host with SSL |
| `FRONTEND_URL` | `http://localhost:5173` | `https://app.example.com` |
| `S3_ENDPOINT` | `http://localhost:9000` (MinIO) | Real S3 endpoint |
| `LOG_LEVEL` | `debug` | `info` or `warn` |

### Production-Only Variables

| Variable | Description |
|----------|-------------|
| `AWS_SES_REGION` | AWS SES region for sending emails |
| `EMAIL_FROM` | Sender email address (e.g., `noreply@example.com`) |

---

## 3. Database Setup

```bash
# Apply all migrations
pnpm db:migrate

# Seed default roles, permissions, and system settings
pnpm db:seed
```

The seed creates:
- Default permissions (users, roles, settings, audit, api-keys)
- System roles (Super Admin with all permissions)
- Default system settings (registration enabled, email verification, etc.)

---

## 4. Running the API

```bash
node apps/api/dist/index.js
```

- Listens on `PORT` (default `3000`)
- Health check: `GET /health` returns `{ status: "ok", timestamp, uptime }`
- Swagger UI available at `/api/docs` (disabled when `NODE_ENV=production`)

### Process Manager

For production, use a process manager to handle restarts and clustering:

```bash
# PM2
pm2 start apps/api/dist/index.js --name api -i max

# Or use your platform's process manager (systemd, Docker, etc.)
```

---

## 5. Serving the Frontend

`apps/web/dist/` contains static files. Serve with any static host:

- **nginx / Caddy** — reverse proxy + static file server
- **S3 + CloudFront** — CDN-backed static hosting
- **Vercel / Netlify** — deploy the `apps/web` directory

### SPA Routing

Configure your static host to serve `index.html` for all routes (SPA fallback). Without this, direct navigation to `/dashboard` will return a 404.

### API URL

The frontend needs to know the API URL. Set `VITE_API_URL` at **build time**:

```bash
VITE_API_URL=https://api.example.com pnpm build
```

---

## 6. Reverse Proxy (nginx Example)

```nginx
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate     /etc/ssl/certs/app.example.com.pem;
    ssl_certificate_key /etc/ssl/private/app.example.com.key;

    # Frontend (static files)
    location / {
        root /var/www/app/apps/web/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check (optional — direct access)
    location = /health {
        proxy_pass http://127.0.0.1:3000;
    }
}

# HTTP redirect
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}
```

---

## 7. Docker (Optional)

The project includes a `docker-compose.yml` for local development services (PostgreSQL and MinIO). For production Docker deployments, create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/api/src/db apps/api/src/db

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
```
