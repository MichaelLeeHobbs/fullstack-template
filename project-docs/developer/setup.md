# Local Development Setup

> **[Template]** This covers the base template feature. Extend or modify for your project.

---

## Prerequisites

| Tool           | Version | Installation                                                  |
|----------------|---------|---------------------------------------------------------------|
| Node.js        | 20+     | [nodejs.org](https://nodejs.org/) or nvm                      |
| pnpm           | 9+      | `npm install -g pnpm`                                         |
| Docker Desktop | Latest  | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git            | Latest  | [git-scm.com](https://git-scm.com/)                          |

Verify your installation:

```bash
node --version    # Should be 20+
pnpm --version    # Should be 9+
docker --version  # Should show Docker version
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd fullstack-template

# 2. Install dependencies
pnpm install

# 3. Start Docker services (PostgreSQL + MinIO)
pnpm docker:up

# 4. Copy environment file
cp .env.example .env

# 5. Run database migrations and seed
pnpm db:migrate
pnpm db:seed

# 6. Start development servers
pnpm dev
```

After step 6, you will have:

| Service        | URL                         |
|----------------|-----------------------------|
| Frontend       | http://localhost:5173        |
| API            | http://localhost:3000        |
| API Health     | http://localhost:3000/health |
| MinIO Console  | http://localhost:9001        |
| Drizzle Studio | http://localhost:4983        |

---

## Docker Services

The project uses Docker Compose to run infrastructure services locally.

### Service Details

| Service    | Container  | Ports              | Credentials              |
|------------|------------|--------------------|--------------------------|
| PostgreSQL | app-db     | 5433:5432          | user: `app` / pass: `app_dev` |
| MinIO      | app-minio  | 9000 (S3), 9001 (Console) | user: `app` / pass: `app_dev_password` |

### Docker Commands

```bash
# Start services in background
pnpm docker:up

# Stop services (preserves data)
pnpm docker:down

# Stop services and delete all data
pnpm docker:reset

# View logs
pnpm docker:logs

# Connect to PostgreSQL directly
pnpm docker:db:psql
```

---

## Environment Configuration

Copy `.env.example` to `.env`. The defaults work for local development:

```bash
cp .env.example .env
```

Key variables:

| Variable       | Default                                          | Description                      |
|----------------|--------------------------------------------------|----------------------------------|
| `NODE_ENV`     | `development`                                    | Runtime environment              |
| `PORT`         | `3000`                                           | API server port                  |
| `DATABASE_URL` | `postgresql://app:app_dev@localhost:5433/app`     | PostgreSQL connection string     |
| `JWT_SECRET`   | *(set in .env.example)*                          | JWT signing secret (32+ chars)   |
| `LOG_LEVEL`    | `debug`                                          | Pino log level                   |
| `S3_ENDPOINT`  | `http://localhost:9000`                          | MinIO/S3 endpoint                |
| `EMAIL_PROVIDER` | `mock`                                         | Email provider (mock/smtp/ses)   |
| `FRONTEND_URL` | `http://localhost:5173`                          | Used in email link generation    |

> **Note**: The Docker Compose file maps PostgreSQL to host port **5433** (not the default 5432) to avoid conflicts with any locally installed PostgreSQL instance. The `.env.example` already reflects this.

For a full list of environment variables and their descriptions, see the `.env.example` file or `docs/architecture/DEV_ENVIRONMENT.md`.

---

## Database Setup

### Initial Setup

```bash
# Apply all migrations to create the schema
pnpm db:migrate

# Seed the database with default data (roles, permissions, settings)
pnpm db:seed
```

### Schema Changes

When you modify a schema file in `apps/api/src/db/schema/`:

```bash
# Generate a migration from your schema changes
pnpm db:generate

# Apply the migration
pnpm db:migrate
```

> **Important**: `pnpm db:generate` runs `pnpm build` first, so your TypeScript must compile successfully before migration generation can proceed.

### Database GUI

```bash
# Open Drizzle Studio at http://localhost:4983
pnpm db:studio
```

### Reset Database

```bash
# Nuclear reset: delete all data and recreate
pnpm docker:reset
pnpm docker:up
pnpm db:migrate
pnpm db:seed
```

---

## Development Servers

```bash
# Start both API and web in parallel
pnpm dev

# Start API only (http://localhost:3000)
pnpm dev:api

# Start Web only (http://localhost:5173)
pnpm dev:web
```

Both servers support hot-reload. The API uses `tsx --watch` and the web frontend uses Vite HMR.

---

## MinIO (S3-Compatible Storage)

MinIO provides local S3-compatible object storage for file uploads and assets.

### Console Access

1. Open http://localhost:9001
2. Login with `app` / `app_dev_password`
3. Create a bucket named `app-assets`

### S3 Configuration in `.env`

```bash
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=app-assets
S3_REGION=us-east-1
```

---

## Build and Lint

```bash
# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

---

## Common Issues and Solutions

### Port Already in Use

If port 3000 or 5173 is already occupied:

```bash
# Windows: find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Docker Services Will Not Start

1. Ensure Docker Desktop is running
2. Check container status: `docker compose ps`
3. Check logs: `docker compose logs`
4. Try a full reset: `pnpm docker:reset && pnpm docker:up`

### Database Connection Refused

1. Verify Docker is running: `docker compose ps`
2. Check the database container health: `docker compose logs db`
3. Verify `DATABASE_URL` in `.env` matches the Docker Compose ports (host port is **5433**)
4. Wait a few seconds after `docker:up` for PostgreSQL to become healthy

### `pnpm db:generate` Fails

This command runs `pnpm build` first. If it fails:
1. Check for TypeScript compilation errors: `pnpm build`
2. Fix any type errors before retrying

### Node Modules Issues

```bash
# Clean and reinstall everything
pnpm clean
rm -rf node_modules
pnpm install
```

### Windows-Specific: Line Endings

Configure Git to avoid CRLF issues:

```bash
git config core.autocrlf false
```

### Windows-Specific: Long Paths

If you encounter path length errors, enable long paths (run as Administrator):

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

---

## Further Reading

- `docs/architecture/DEV_ENVIRONMENT.md` -- detailed environment configuration and pool tuning
- `docs/architecture/CORE_PATTERNS.md` -- full architecture patterns
- `docs/architecture/CODING_STANDARD.md` -- TypeScript conventions
