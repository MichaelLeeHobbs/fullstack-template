# Development Environment

> Last Updated: 2024-12-28

## Overview

This document describes how to set up and run the development environment locally.

---

## Prerequisites

| Tool           | Version | Installation                                                  |
|----------------|---------|---------------------------------------------------------------|
| Node.js        | 20+     | [nodejs.org](https://nodejs.org/) or nvm                      |
| pnpm           | 9+      | `npm install -g pnpm`                                         |
| Docker Desktop | Latest  | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git            | Latest  | [git-scm.com](https://git-scm.com/)                           |

### Verify Installation

```powershell
node --version    # Should be 20+
pnpm --version    # Should be 9+
docker --version  # Should show Docker version
```

---

## Quick Start

```powershell
# 1. Clone the repository
git clone <repository-url>
cd fullstack-template

# 2. Copy environment file
cp .env.example .env

# 3. Start Docker services
docker compose up -d

# 4. Install dependencies
pnpm install

# 5. Run database migrations
pnpm db:migrate

# 6. Start development servers
pnpm dev
```

---

## Docker Services

### Starting Services

```powershell
# Start all services in background
docker compose up -d

# View running containers
docker compose ps

# View logs
docker compose logs -f
```

### Stopping Services

```powershell
# Stop services (keep data)
docker compose down

# Stop and delete all data
docker compose down -v
```

### Services Reference

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | app-db | 5432 | Database |
| MinIO | app-minio | 9000 (S3), 9001 (Console) | S3-compatible storage |

---

## Database

### Connection

- **Host**: localhost
- **Port**: 5432
- **Database**: app
- **User**: app
- **Password**: app_dev

### Connection String

```
postgresql://app:app_dev@localhost:5432/app
```

### Common Commands

```powershell
# Connect to database
docker exec -it app-db psql -U app -d app

# Generate migration after schema change
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio (GUI)
pnpm db:studio
```

### Pool Configuration

The application uses `pg.Pool` with explicit connection pool settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `max` | 20 | Maximum connections in the pool |
| `idleTimeoutMillis` | 30000 | Close idle connections after 30s |
| `connectionTimeoutMillis` | 5000 | Fail if no connection available within 5s |

Docker PostgreSQL defaults to `max_connections = 100`. With `max: 20`, you can run up to 5 app instances against one database.

**Production tuning:** Set `max` to `(num_cores * 2) + effective_spindle_count` (typically 5-10 for most workloads). More connections does not mean better performance — each connection consumes ~10MB of PostgreSQL memory.

**Monitoring:** The pool exposes counters for debugging:
- `pool.totalCount` — total connections (active + idle)
- `pool.idleCount` — connections available for use
- `pool.waitingCount` — queued requests waiting for a connection (should be 0)

---

## MinIO (S3-Compatible Storage)

### Console Access

- **URL**: http://localhost:9001
- **Username**: app
- **Password**: app_dev

### Initial Setup

1. Open MinIO Console at http://localhost:9001
2. Login with credentials above
3. Create bucket: `app-assets`
4. (Optional) Create access key for testing

### SDK Configuration

MinIO is S3-compatible. Use AWS SDK with custom endpoint:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'app',
    secretAccessKey: 'app_dev',
  },
  forcePathStyle: true, // Required for MinIO
});
```

---

## Development Servers

### Start All

```powershell
pnpm dev
```

This starts both API and Web servers in parallel.

### Start Individually

```powershell
# API only (port 3000)
pnpm dev:api

# Web only (port 5173)
pnpm dev:web
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| API Health | http://localhost:3000/health |
| Drizzle Studio | http://localhost:4983 |
| MinIO Console | http://localhost:9001 |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://app:app_dev@localhost:5432/app

# Auth
JWT_SECRET=your-development-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=app
S3_SECRET_KEY=app_dev
S3_BUCKET=app-assets
S3_REGION=us-east-1

# AI (Optional for development)
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
```

---

## Common Tasks

### Reset Database

```powershell
# Delete all data and recreate
docker compose down -v
docker compose up -d
pnpm db:migrate
```

### Clear Node Modules

```powershell
# Remove all node_modules
pnpm clean
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Reinstall
pnpm install
```

### Update Dependencies

```powershell
# Check for updates
pnpm outdated

# Update all (be careful)
pnpm update
```

---

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Prisma (for .prisma file highlighting, works for Drizzle too)

### WebStorm

- Enable ESLint integration
- Enable Prettier on save
- Configure Node.js interpreter

---

## Troubleshooting

### Port Already in Use

```powershell
# Find process using port
netstat -ano | findstr :5432

# Kill process
taskkill /PID <PID> /F
```

### Docker Issues

```powershell
# Restart Docker Desktop
# Then restart containers
docker compose down
docker compose up -d
```

### Database Connection Failed

1. Ensure Docker is running
2. Check container is healthy: `docker compose ps`
3. Check logs: `docker compose logs db`
4. Verify DATABASE_URL in .env

### MinIO Not Accessible

1. Check container: `docker compose logs minio`
2. Ensure port 9001 is free
3. Try restarting: `docker compose restart minio`

### Node Modules Issues

```powershell
# Nuclear option - delete everything and reinstall
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf pnpm-lock.yaml
pnpm install
```

---

## Windows-Specific Notes

### Line Endings

Git may convert line endings. Configure:

```powershell
git config core.autocrlf false
```

### Path Length

Enable long paths if you encounter issues:

```powershell
# Run as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### PowerShell Execution Policy

If scripts won't run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

