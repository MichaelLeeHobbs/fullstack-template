# Developer Documentation

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Everything developers need to get started, write quality code, and contribute to the project.

---

## Overview

This section provides comprehensive developer guidance, from initial setup through testing and CI/CD. It extends the template-level architecture docs with project-specific standards and workflows.

---

## Sections

### Local Setup

> [`setup.md`](./setup.md)

Step-by-step guide to set up the development environment:
- Prerequisites (Node.js 20+, pnpm 9+, Docker)
- Clone and install
- Docker services (PostgreSQL, MinIO)
- Database migration and seeding
- Running the dev servers
- IDE configuration (WebStorm, VS Code)
- Troubleshooting common issues

See also: [Dev Environment](../../docs/architecture/DEV_ENVIRONMENT.md) (template-level reference)

---

### Coding Standards

> [`coding-standards.md`](./coding-standards.md)

Project coding conventions and patterns:
- TypeScript conventions (no enums, const objects)
- Error handling with `Result<T>` and `tryCatch()`
- Validation with Zod v4
- Logging with Pino (structured, never `console.log`)
- API response format
- Naming conventions (files, variables, types)
- Import ordering

See also: [Coding Standard](../../docs/architecture/CODING_STANDARD.md) (template-level reference)

---

### Contributing

> [`contributing.md`](./contributing.md)

How to contribute to the project:
- Branch naming conventions
- Commit message format
- Pull request process
- Code review guidelines
- Definition of done

---

### CI/CD

> [`ci-cd.md`](./ci-cd.md)

Continuous integration and deployment pipeline:
- GitHub Actions workflows
- Build and test stages
- Lint checks
- Automated deployment triggers
- Environment promotion (dev -> staging -> production)

---

### Testing

> [`testing/`](./testing/)

Test strategy and guides:

| Document | Description |
|----------|-------------|
| `strategy.md` | Overall test strategy (unit, integration, e2e) |
| `unit-tests.md` | Writing unit tests (Vitest, mocking patterns) |
| `integration-tests.md` | Writing integration tests (API, database) |
| `test-utilities.md` | Shared test utilities (mock-db, mock-express, factories) |
| `coverage.md` | Coverage requirements and reporting |

**Test commands:**
```bash
pnpm test              # Run all tests
pnpm test:api          # Run API tests only
pnpm test:web          # Run web tests only
pnpm test:e2e          # Run Playwright E2E tests (headless)
pnpm test:e2e:headed   # Run E2E tests with visible browser
pnpm test:e2e:ui       # Run E2E tests in Playwright UI mode
pnpm --filter api test:watch  # Watch mode for API tests
```

**Test file locations:**
- Unit tests: Co-located with source (e.g., `auth.service.test.ts`)
- Integration tests: `apps/api/test/integration/`
- E2E tests: `apps/e2e/tests/` (Playwright)
- Test utilities: `apps/api/test/utils/`

---

## Quick Reference

### Common Commands

```bash
# Development
pnpm dev              # Start both API and web
pnpm dev:api          # API only (port 3000)
pnpm dev:web          # Web only (port 5173)

# Quality
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm test:e2e         # Run Playwright E2E tests

# Database
pnpm db:generate      # Generate migration after schema change
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio
pnpm db:seed          # Seed with test data

# Docker
pnpm docker:up        # Start PostgreSQL and MinIO
pnpm docker:down      # Stop services
pnpm docker:reset     # Stop and delete all data
```

### Project Structure

```
apps/
├── api/src/
│   ├── controllers/    # HTTP handlers
│   ├── services/       # Business logic (Result<T>)
│   ├── routes/         # Route definitions
│   ├── middleware/      # Auth, validation
│   ├── providers/      # External APIs (S3, email)
│   ├── jobs/           # Background tasks
│   ├── db/schema/      # Drizzle schema
│   ├── schemas/        # Zod validation
│   └── lib/            # Utilities (db, logger, jwt)
│
├── web/src/
│   ├── components/     # React components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom hooks
│   ├── api/            # API client
│   ├── stores/         # Zustand stores
│   └── styles/         # Theme
│
└── packages/shared/    # Shared types and utilities
```

---

## Related Documentation

- [Template Architecture](../../docs/architecture/) - Core patterns, tech stack, data model
- [Template Features](../../docs/features/) - What is included in the template
- [AI Agent Instructions](../../docs/AI_README.md) - Guidelines for AI-assisted development
- [QA Test Cases](../qa/README.md) - Test case reference for QA
