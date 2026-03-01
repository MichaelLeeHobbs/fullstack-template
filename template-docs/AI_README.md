# AI Agent Instructions

> Instructions for AI agents (GitHub Copilot, Claude, etc.) working on this fullstack template project.

---

## Critical Rules

### 1. Do Not Assume

- **ASK** if you are unsure about requirements, patterns, or implementation details
- **ASK** if a task seems ambiguous or could be interpreted multiple ways
- **ASK** before making architectural decisions not covered in documentation
- Review existing patterns in the codebase before implementing new features

### 2. Stop and Ask for Help When

- A terminal command fails repeatedly
- A test is failing and you've tried 2-3 fixes without success
- An error message is unclear or unexpected
- You're about to make changes outside the scope of the current task
- You need to install a new dependency not already in the tech stack

### 3. Read Before Writing

- Always read relevant documentation before implementing
- Check existing code for patterns before writing new code
- Review the feature specification if one exists
- Look at similar implementations in the codebase

---

## Project Context

### What is this?

A fullstack template project providing a foundation for building modern web applications. It includes:

- **Backend**: Express API with authentication, authorization, and database access
- **Frontend**: React SPA with Material UI, state management, and routing
- **Shared**: Common types and utilities shared between frontend and backend
- **Infrastructure**: Docker Compose for local development (PostgreSQL, MinIO)

---

## Key Documentation

Read these documents before starting work:

| Document                               | Purpose                                              |
|----------------------------------------|------------------------------------------------------|
| `template-docs/features/README.md`             | What's included in the template                      |
| `template-docs/architecture/DEV_ENVIRONMENT.md` | Local development setup                              |
| `template-docs/architecture/CODING_STANDARD.md` | Code conventions, patterns                           |
| `template-docs/architecture/CORE_PATTERNS.md`   | Architecture (Router → Controller → Service → Model) |
| `template-docs/architecture/TECH_STACK.md`      | Libraries and frameworks                             |
| `template-docs/architecture/DATA_MODEL.md`      | Database schema (Drizzle)                            |

### Project Documentation

Enterprise-level docs live in `project-docs/`. Refer to these for operational and project-specific context:

| Document                               | Purpose                                              |
|----------------------------------------|------------------------------------------------------|
| `project-docs/api/`                    | API endpoint reference, auth, error codes, pagination |
| `project-docs/architecture/adr/`       | Architecture Decision Records (why decisions were made) |
| `project-docs/operations/`             | Deployment, monitoring, incidents, database ops       |
| `project-docs/security/`              | Security audit, threat model, policies, data protection |
| `project-docs/stories/`               | User stories (42 across 9 areas)                     |
| `project-docs/qa/`                    | QA test cases (~140 across 9 areas)                  |

---

## Coding Standards Summary

### Error Handling - Result Pattern

**ALWAYS use `tryCatch()` from stderr-lib. Services return `Result<T>`, never throw.**

```typescript
import { tryCatch, type Result } from 'stderr-lib';

// ✅ CORRECT - Service returns Result
export class ItemService {
  static async getById(userId: string, itemId: string): Promise<Result<Item>> {
    return tryCatch(async () => {
      const [item] = await db.select().from(items)
        .where(eq(items.id, itemId));

      if (!item || item.createdByUserId !== userId) {
        throw new Error('Item not found');
      }

      return item;
    });
  }
}

// ✅ CORRECT - Controller handles Result
static async getById(req: Request, res: Response): Promise<void> {
  const result = await ItemService.getById(req.user!.id, req.params.id);

  if (!result.ok) {
    logger.error('Failed to get item', { error: result.error.toString() });
    return void res.status(404).json({ success: false, error: 'Item not found' });
  }

  res.json({ success: true, data: result.value });
}
```

### Validation - Zod v4

```typescript
import { z } from 'zod/v4';

const schema = z.object({ name: z.string().min(1) });
const result = schema.safeParse(req.body);

if (!result.success) {
  return void res.status(400).json({ 
    success: false, 
    error: z.prettifyError(result.error) 
  });
}
```

### No TypeScript Enums

```typescript
// ❌ BAD
enum Status { Active, Inactive }

// ✅ GOOD
const Status = { Active: 'active', Inactive: 'inactive' } as const;
type Status = typeof Status[keyof typeof Status];
```

### Logging

```typescript
import logger from '../lib/logger';

// ✅ Use structured logging
logger.info('User created', { userId: user.id });
logger.error('Operation failed', { error: result.error.toString() });

// ❌ Never use console.log
console.log('debugging');
```

---

## File Organization

```
apps/
├── api/src/
│   ├── controllers/    # HTTP handlers (parse request, call service, format response)
│   ├── services/       # Business logic (return Result<T>, no HTTP concerns)
│   ├── routes/         # Route definitions
│   ├── middleware/     # Auth, validation, error handling
│   ├── providers/      # External APIs (S3, email)
│   ├── jobs/           # Background tasks
│   ├── db/schema/      # Drizzle schema
│   ├── schemas/        # Zod validation
│   └── lib/            # Utilities (db, logger, jwt)
│
└── web/src/
    ├── components/     # React components
    ├── pages/          # Route pages
    ├── hooks/          # Custom hooks (data fetching)
    ├── api/            # API client
    ├── stores/         # Zustand stores
    └── styles/         # Theme (dark mode support)
```

---

## Common Tasks

### Adding a New Feature

1. Read the feature doc in `template-docs/features/XX_feature-name.md`
2. Check dependencies (other features it relies on)
3. Implement in order: Schema → Service → Controller → Routes → UI

### Adding a New API Endpoint

1. Add Zod schema in `src/schemas/`
2. Add service method returning `Result<T>`
3. Add controller method using `tryCatch()`
4. Add route in `src/routes/`
5. Update API client in frontend

### Database Changes

1. Modify schema in `src/db/schema/`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply

---

## Tech Stack Quick Reference

| Category       | Technology                            |
|----------------|---------------------------------------|
| Runtime        | Node.js 20+, TypeScript 5.x           |
| Backend        | Express 4.x                           |
| Database       | PostgreSQL 17, Drizzle ORM            |
| Frontend       | React 18, Vite, MUI 6, TanStack Query |
| Validation     | Zod v4 (`zod/v4`)                     |
| Error Handling | stderr-lib (`tryCatch`, `stderr`)     |
| Logging        | Pino                                  |
| Auth           | JWT + bcrypt                          |
| State          | Zustand                               |
| Testing        | Vitest (unit/integration), Playwright (E2E) |

---

## Before Starting a New Chat

If this is a continuation from a previous chat:

1. Ask what was accomplished in the previous session
2. Ask what the current task/goal is
3. Review any files mentioned as recently modified
4. Check `template-docs/features/README.md` for current status

---

## Environment

- **OS**: Windows (use PowerShell commands, `;` not `&&`)
- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)

---

## AI Development Cycle

When implementing features, follow this complete cycle:

### 1. Plan
- Read relevant docs in `template-docs/architecture/`
- Check `project-docs/stories/` for user stories related to the feature
- Identify affected layers (Router → Controller → Service → Model)

### 2. Implement
- Schema changes: `apps/api/src/db/schema/` → run `pnpm db:generate` → `pnpm db:migrate`
- Service: `apps/api/src/services/` — Return `Result<T>` via `tryCatch()`, never throw
- Controller: `apps/api/src/controllers/` — Parse request, call service, format response
- Routes: `apps/api/src/routes/` — Wire up routes with middleware
- Frontend: Component → Hook → API Client → Backend

### 3. Write Unit Tests
- Co-locate tests with source: `foo.service.test.ts` next to `foo.service.ts`
- Use test utilities from `apps/api/test/utils/` (mock-db, mock-express, factories)
- Test both success and error paths for every service method
- Run `pnpm test:api` and `pnpm test:web` — all must pass

### 4. Write E2E Tests
- Add Playwright tests in `apps/e2e/tests/`
- Test full user workflows (login → action → verify)
- Run `pnpm test:e2e` with Docker running

### 5. Update Documentation
- Update `template-docs/features/` if adding a new feature
- Update `template-docs/architecture/` if changing patterns
- Update `project-docs/` for API changes, new endpoints

### 6. QA Verification
- Direct human to run relevant QA test cases from `project-docs/qa/`
- Reference specific test case IDs when applicable

---

## When in Doubt

1. Check the documentation
2. Look at existing code for patterns
3. **ASK the user** - they would rather clarify than fix mistakes

