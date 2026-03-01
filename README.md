# Fullstack Template

[![CI](https://github.com/MichaelLeeHobbs/fullstack-template/actions/workflows/ci.yml/badge.svg)](https://github.com/MichaelLeeHobbs/fullstack-template/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.7-blue)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-orange)](https://pnpm.io/)

A production-ready fullstack monorepo template with authentication, RBAC, MFA, audit logging, and more — built with Express, React, and TypeScript.

## Features

- **Authentication** — Registration, login, JWT tokens, password reset, email verification
- **Multi-Factor Auth** — TOTP-based 2FA with QR codes and backup codes
- **Role-Based Access Control** — Granular permissions system with admin UI
- **Session Management** — Track and revoke active sessions
- **Account Security** — Lockout protection, rate limiting, audit logging
- **API Key Management** — Scoped, revocable keys for service-to-service auth
- **PKI / Certificate Auth** — X.509 certificate issuance, CRL, mTLS login
- **Real-Time Events** — WebSocket notifications via Socket.IO
- **File Storage** — S3-compatible uploads with pre-signed URLs (MinIO for dev)
- **Email** — Mock (dev), SMTP, or AWS SES providers
- **API Docs** — Auto-generated OpenAPI/Swagger at `/api-docs`
- **Dark Mode** — Theme toggle with Material UI
- **CI/CD** — GitHub Actions pipeline with lint, unit, integration, and E2E tests
- **Error Tracking** — Optional Sentry integration (frontend + backend)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+, TypeScript 5.7 |
| Backend | Express 4, Drizzle ORM, PostgreSQL 17 |
| Frontend | React 18, Vite 6, Material UI 6, TanStack Query 5 |
| Validation | Zod v4 |
| Auth | JWT + Argon2/bcrypt |
| State | Zustand |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Logging | Pino |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Docker](https://www.docker.com/) (for PostgreSQL and MinIO)

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/MichaelLeeHobbs/fullstack-template.git
cd fullstack-template

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example apps/api/.env

# 4. Start Docker services (PostgreSQL + MinIO)
pnpm docker:up

# 5. Run database migrations and seed data
pnpm db:migrate
pnpm db:seed

# 6. Start development servers
pnpm dev
```

The API runs at **http://localhost:3000** and the web app at **http://localhost:5173**.

Default seed credentials: `admin@example.com` / `password123`

## Project Structure

```
fullstack-template/
├── apps/
│   ├── api/                   # Express backend
│   │   ├── src/
│   │   │   ├── controllers/   # Request handling
│   │   │   ├── services/      # Business logic (Result pattern)
│   │   │   ├── routes/        # Route definitions
│   │   │   ├── middleware/     # Auth, validation, rate limiting
│   │   │   ├── db/schema/     # Drizzle ORM schemas
│   │   │   ├── providers/     # External integrations (S3, email)
│   │   │   ├── jobs/          # Background tasks (pg-boss)
│   │   │   └── lib/           # Utilities (db, logger, jwt)
│   │   └── test/              # Integration tests & utilities
│   ├── web/                   # React SPA
│   │   └── src/
│   │       ├── pages/         # Route pages
│   │       ├── components/    # Shared components
│   │       ├── hooks/         # TanStack Query hooks
│   │       ├── api/           # API client layer
│   │       └── stores/        # Zustand state stores
│   └── e2e/                   # Playwright E2E tests
├── packages/
│   └── shared/                # Shared types, schemas, constants
├── project-docs/              # Architecture, API, security docs
├── template-docs/             # Template usage guides
├── docker-compose.yml
└── .env.example
```

## Commands

### Development

```bash
pnpm dev              # Start API + web in parallel
pnpm dev:api          # Start API only (port 3000)
pnpm dev:web          # Start web only (port 5173)
```

### Build & Lint

```bash
pnpm build            # Build all packages
pnpm lint             # Lint all packages
```

### Testing

```bash
pnpm test             # Run all tests
pnpm test:api         # API unit + integration tests
pnpm test:web         # Web component tests
pnpm test:e2e         # Playwright E2E tests (requires Docker)
pnpm test:e2e:ui      # E2E tests in Playwright UI mode
pnpm test:coverage    # Generate coverage reports
```

### Database

```bash
pnpm db:generate      # Generate migration after schema change
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:seed          # Seed database with test data
```

### Docker

```bash
pnpm docker:up        # Start PostgreSQL + MinIO
pnpm docker:down      # Stop services
pnpm docker:reset     # Stop and delete all data
pnpm docker:logs      # Tail service logs
```

## Architecture

### Backend (4-Layer Pattern)

```
Request → Router → Middleware → Controller → Service → Database
```

- **Router** — Route definitions and middleware attachment
- **Controller** — Parse requests, call services, format responses
- **Service** — All business logic, returns `Result<T>` via `tryCatch()` (never throws)
- **Model** — Drizzle ORM schema definitions

### Frontend

```
Component → Hook (TanStack Query) → API Client → Backend
```

- **Pages** — Route-level components
- **Hooks** — Data fetching and mutations via TanStack Query
- **API Client** — Fetch-based HTTP client with auth token injection
- **Stores** — Zustand for global state (auth, theme)

## Environment Variables

Copy `.env.example` to `apps/api/.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://app:app_dev@localhost:5433/app` | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for signing JWT tokens (32+ chars) |
| `S3_ENDPOINT` | `http://localhost:9000` | S3/MinIO endpoint |
| `EMAIL_PROVIDER` | `mock` | Email provider: `mock`, `smtp`, or `ses` |
| `LOG_LEVEL` | `debug` | Pino log level |
| `SENTRY_DSN` | — | Optional Sentry error tracking DSN |

See [`.env.example`](.env.example) for the full list.

## Documentation

| Topic | Location |
|-------|----------|
| Features & completion status | [`template-docs/features/`](template-docs/features/README.md) |
| Architecture patterns | [`template-docs/architecture/`](template-docs/architecture/CORE_PATTERNS.md) |
| Coding standards | [`template-docs/architecture/CODING_STANDARD.md`](template-docs/architecture/CODING_STANDARD.md) |
| API reference | [`project-docs/api/`](project-docs/api/) |
| Security documentation | [`project-docs/security/`](project-docs/security/) |
| Deployment guide | [`project-docs/operations/`](project-docs/operations/) |
| Architecture Decision Records | [`project-docs/architecture/adr/`](project-docs/architecture/adr/) |
| Dependency documentation | [`project-docs/developer/dependencies.md`](project-docs/developer/dependencies.md) |

## Using as a Template

1. Fork or clone this repository
2. Update `package.json` names and metadata
3. Modify the Drizzle schema in `apps/api/src/db/schema/` for your domain
4. Add your routes, services, and pages
5. Adjust environment variables for your infrastructure

The shared package (`@fullstack-template/shared`) provides a single source of truth for types, validation schemas, and constants used by both frontend and backend.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure `pnpm lint`, `pnpm build`, and `pnpm test` pass
4. Open a pull request

## License

This project is not yet licensed. See [LICENSE](LICENSE) when available.
