# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fullstack template for building modern web applications. It can be used in two modes:
1. **Template Development**: Expanding the template itself with new features
2. **Project Creation**: Users who have copied/cloned/forked this can build their own application on top

### Structure

pnpm monorepo with three packages:
- `apps/api` - Express backend with Drizzle ORM
- `apps/web` - React frontend with Vite and Material UI
- `packages/shared` - Shared types, constants, and validation schemas (`@fullstack-template/shared`)

#### Shared Package (`packages/shared`)

All domain types, API response types, and constants used by both frontend and backend live here. Import from `@fullstack-template/shared` — never duplicate types locally. Structure:
- `constants/permissions.ts` — `PERMISSIONS` const and `PermissionName` type (single source of truth)
- `schemas/auth.schema.ts` — Zod form validation schemas (with `confirmPassword` for frontend forms)
- `types/` — Domain types: `api.ts`, `auth.ts`, `role.ts`, `api-key.ts`, `pki.ts`, `admin.ts`

## Commands

```bash
# Development
pnpm dev              # Start both API and web in parallel
pnpm dev:api          # Start API only (port 3000)
pnpm dev:web          # Start web only (port 5173)

# Build & Lint
pnpm build            # Build all packages
pnpm lint             # Lint all packages

# Testing
pnpm test             # Run all tests
pnpm test:api         # Run API tests only
pnpm test:web         # Run web tests only
pnpm test:e2e         # Run Playwright E2E tests (requires Docker)
pnpm test:e2e:headed  # Run E2E tests with visible browser
pnpm test:e2e:ui      # Run E2E tests in Playwright UI mode
pnpm --filter api test:watch  # Watch mode for API tests

# Database (requires Docker running)
pnpm db:generate      # Generate migration after schema change
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:seed          # Seed database with test data

# Docker
pnpm docker:up        # Start PostgreSQL and MinIO
pnpm docker:down      # Stop services
pnpm docker:reset     # Stop and delete all data
```

## Architecture

### Backend (4-Layer Pattern)

Request flow: **Router → Middleware → Controller → Service → Model (Drizzle)**

- **Router** (`src/routes/`): Route definitions, middleware attachment. No business logic.
- **Controller** (`src/controllers/`): Parse request, call service, format response. No direct DB access.
- **Service** (`src/services/`): All business logic. Returns `Result<T>` using `tryCatch()`. No HTTP concerns.
- **Model** (`src/db/schema/`): Drizzle schema definitions and type exports.

Additional layers:
- **Providers** (`src/providers/`): External integrations (S3, email)
- **Jobs** (`src/jobs/`): Background tasks
- **Libs** (`src/lib/`): Shared utilities (db, logger, jwt)

### Frontend Pattern

Component flow: **Component → Hook → API Client → Backend**

- **Component**: UI rendering, uses hooks for data
- **Hook** (`src/hooks/`): TanStack Query for data fetching
- **API Client** (`src/api/`): HTTP requests with auth token injection
- **Store** (`src/stores/`): Zustand for global state (auth, theme)

## Critical Patterns

### Error Handling - Result Pattern with stderr-lib

Services MUST return `Result<T>`, never throw. Always use `tryCatch()`:

```typescript
import { tryCatch, type Result } from 'stderr-lib';

// Service method
static async getById(id: string): Promise<Result<Item>> {
  return tryCatch(async () => {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    if (!item) throw new Error('Item not found');
    return item;
  });
}

// Controller handling
const result = await ItemService.getById(id);
if (!result.ok) {
  logger.error('Failed', { error: result.error.toString() });
  return void res.status(404).json({ success: false, error: 'Not found' });
}
res.json({ success: true, data: result.value });
```

### Validation - Zod v4

```typescript
import { z } from 'zod/v4';

const result = schema.safeParse(req.body);
if (!result.success) {
  return void res.status(400).json({
    success: false,
    error: z.prettifyError(result.error)
  });
}
```

### No TypeScript Enums

Use const objects or union types instead:

```typescript
// Use this
const Status = { Active: 'active', Inactive: 'inactive' } as const;
type Status = typeof Status[keyof typeof Status];

// Not this
enum Status { Active, Inactive }
```

### API Response Format

```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Error description" }
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+, TypeScript 5.x |
| Backend | Express 4.x, Drizzle ORM, PostgreSQL |
| Frontend | React 18, Vite, Material UI 6, TanStack Query |
| Validation | Zod v4 (`import { z } from 'zod/v4'`) |
| Error Handling | stderr-lib (`tryCatch`, `stderr`) |
| Auth | JWT + bcrypt |
| State | Zustand |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Logging | Pino (never use console.log) |

## Environment

- **OS**: Windows (use PowerShell commands)
- **Package Manager**: pnpm 9+
- **Database**: PostgreSQL via Docker (port 5432)
- **Storage**: MinIO via Docker (port 9000, console 9001)

Connection: `postgresql://app:app_dev@localhost:5432/app`

## Documentation

### Template Docs (`docs/`)
- `docs/architecture/CORE_PATTERNS.md` - Full architecture patterns
- `docs/architecture/CODING_STANDARD.md` - TypeScript conventions
- `docs/architecture/DEV_ENVIRONMENT.md` - Local setup guide
- `docs/features/README.md` - Included features
- `docs/AI_README.md` - Extended AI agent instructions

### Project Docs (`project-docs/`)
- `project-docs/architecture/adr/` - Architecture Decision Records (13 ADRs)
- `project-docs/architecture/c4/` - C4 model diagrams (context, containers, components)
- `project-docs/architecture/design/` - Design docs (data model ERD, API guidelines, CA system)
- `project-docs/api/` - API endpoint reference, authentication guide, error codes
- `project-docs/developer/` - Setup, coding standards, contributing, CI/CD, testing guides
- `project-docs/operations/` - Deployment, monitoring, incidents, database operations
- `project-docs/security/` - Threat model, auth security, data protection, audit report
- `project-docs/product/` - Feature tracker, changelog, admin guide
- `project-docs/stories/` - User stories (42 stories across 9 feature areas)
- `project-docs/qa/` - QA test cases (140 cases across 9 feature areas)
