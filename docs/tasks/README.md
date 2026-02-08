# Task Lifecycle

How to create, structure, execute, and close tasks in this project.

---

## 1. Research Phase

Before writing a task, understand the problem space.

- **Read the code you'll change.** Do not plan changes to files you haven't read. Use grep/glob to find all relevant files, then read them. This is a monorepo — a change to `packages/shared` affects both `apps/api` and `apps/web`.
- **Read the tests.** Check `apps/api/src/**/*.test.ts` and `apps/web/src/**/*.test.ts` for existing coverage. Understand what invariants exist before changing behavior.
- **Trace the request flow.** For backend changes, trace from Router → Middleware → Controller → Service → Model. For frontend changes, trace from Component → Hook → API Client → Backend. Know every layer a change touches.
- **Check the schema.** Read `apps/api/src/db/schema/` to understand the current data model. If your change involves new tables or columns, read `docs/architecture/DATA_MODEL.md` and existing migration files in `apps/api/src/db/migrations/`.
- **Map cross-package dependencies.** Changes to `@fullstack-template/shared` affect both apps. Check what each app imports from the shared package before modifying its exports.
- **Check the original behavior.** Use `git show HEAD:<path>` to read the pre-change version of any file. This is your source of truth for "what worked before."
- **Identify the blast radius.** List every file that will change. If the count exceeds ~15, consider splitting into smaller tasks.

## 2. Writing the Task

Tasks live in `docs/tasks/`. Use this structure:

```markdown
# Title

**Status:** Draft | Ready | In Progress | Complete
**Priority:** High | Medium | Low
**Created:** YYYY-MM-DD
**Files:** list key files

---

## Context
One paragraph: what exists today, what's wrong, what the goal is.

## Phases
Break work into phases that can each be verified independently.

### Phase N: Short Title
**Layer:** Backend | Frontend | Shared | Database | Full Stack
**Files:** which files change in this phase

- Bullet list of concrete changes (not vague goals)
- Include the actual class/function/route/table names
- State what values change from/to

## Phase Dependency Order
Which phases depend on which. Identify what can run in parallel.
Database schema changes always come first.

## Verification
Exact commands to run after each phase and after all phases.
```

### What makes a good phase

- **One concern per phase.** "Add database schema" is one phase. "Add schema and build the API routes and create the React page" is three.
- **Follows the layer order.** For full-stack features, phase order should be: Database Schema → Shared Types → Backend Service → Backend Controller/Routes → Frontend API Client → Frontend Hook → Frontend Component. Each phase builds on the last.
- **Independently verifiable.** After completing a phase, you can run `pnpm build`, `pnpm lint`, and `pnpm test` without needing later phases.
- **Small enough to hold in your head.** If a phase touches more than 8-10 files, split it.
- **Ordered by risk.** Database migrations before application code. Backend before frontend. Bug fixes before refactors.

### What makes a bad task

- **Tasks that assume code you haven't read.** You will get service method names, route paths, schema column names, and component props wrong. Read first.
- **Tasks that batch too many layers.** "Add the Drizzle schema AND the service AND the controller AND the React page AND the hooks" is five phases pretending to be one. Each layer should be its own phase.
- **Tasks with vague steps.** "Add the API endpoint" is not a step. "Add `GET /api/v1/items/:id` to `apps/api/src/routes/item.routes.ts`, guarded by `authenticate` middleware, calling `ItemController.getById`" is a step.
- **Tasks that skip the Result pattern.** Every service method must return `Result<T>` via `tryCatch()`. If the task describes a service method that throws, the task is wrong.
- **Tasks that don't account for migrations.** Schema changes require `pnpm db:generate` and `pnpm db:migrate`. If the task changes a Drizzle schema and doesn't include a migration step, it's incomplete.

## 3. Execution

### Before starting a phase

1. Re-read every file the phase will touch. Code may have changed since you wrote the task.
2. Run `pnpm build` and `pnpm lint` to establish a clean baseline. Do not start a phase with pre-existing errors.
3. If the phase involves database changes, ensure Docker is running (`pnpm docker:up`).

### During a phase

- **Make one logical change at a time.** Edit a file, verify it compiles, move to the next file. Do not edit 10 files and then check for errors.
- **Follow the 4-layer pattern.** Routers define routes. Controllers parse requests and format responses. Services contain business logic and return `Result<T>`. Models define Drizzle schemas. Do not leak concerns across layers.
- **Use the correct imports.** Zod is `import { z } from 'zod/v4'` (not `'zod'`). Error handling is `import { tryCatch } from 'stderr-lib'`. Logging is `import logger from '../lib/logger'` (never `console.log`).
- **Match existing patterns exactly.** Before writing a new service, read an existing one (e.g., `auth.service.ts`). Before writing a new controller, read an existing one. Copy the structure, then modify.
- **Don't change what you're not fixing.** If a file has an existing pattern and the task doesn't call for changing it, leave it alone. Don't "improve" things outside the task scope.
- **Validate at boundaries only.** Use Zod schemas in middleware/controllers for request validation. Don't add redundant validation inside services for data that was already validated upstream.

### After each phase

```bash
pnpm build              # TypeScript compiles across all packages
pnpm lint               # 0 errors, 0 warnings
pnpm test               # All tests pass
```

For database phases, also run:

```bash
pnpm db:generate        # Generate migration from schema changes
pnpm db:migrate         # Apply migration to local database
```

For frontend phases, also run:

```bash
pnpm dev:web            # Open browser, visually inspect at localhost:5173
```

If tests fail or the build breaks, fix it before moving to the next phase. Do not accumulate regressions across phases.

### Common execution mistakes

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Service method throws instead of returning `Result<T>` | Unhandled promise rejection crashes the request | Always wrap service logic in `tryCatch()` from `stderr-lib` |
| Using `import { z } from 'zod'` instead of `'zod/v4'` | Missing `z.prettifyError` and other v4 APIs | Always use `'zod/v4'` — grep existing code to confirm |
| Controller accesses `db` directly | Breaks the 4-layer separation | All database access goes through services |
| Using `console.log` instead of Pino logger | Lint errors, unstructured logs | `import logger from '../lib/logger'` |
| Forgetting `void` on express response returns | TypeScript error: function return type mismatch | Use `return void res.status(X).json(...)` pattern |
| Changing shared package without rebuilding | Apps import stale types | Run `pnpm build` after changing `packages/shared` |
| Adding a Drizzle schema column without migration | Runtime error: column doesn't exist in PostgreSQL | Always run `pnpm db:generate` then `pnpm db:migrate` |
| Using TypeScript `enum` | Violates project coding standard | Use `const` objects with `as const` and derived union types |
| Creating a floating promise | Lint error, potential unhandled rejection | Use `await` or explicitly `void` the call |
| Adding a route without middleware | Endpoint is unprotected | Apply `authenticate` and permission middleware in the router |
| Forgetting to export from barrel file | Import fails in consuming code | Update `index.ts` in the relevant directory |
| Frontend component fetches directly | Breaks Component → Hook → API Client pattern | Create a hook using TanStack Query, which calls the API client |

## 4. Verification and Closing

### Final checks

1. `pnpm build` succeeds across all three packages
2. `pnpm lint` passes with 0 errors, 0 warnings
3. `pnpm test` — all tests pass (check both API and web test counts)
4. If database changes: migration applies cleanly on a fresh database (`pnpm docker:reset && pnpm docker:up && pnpm db:migrate && pnpm db:seed`)
5. Visual inspection in the browser for any frontend changes
6. No layer violations: services don't import from `express`, controllers don't import from `drizzle-orm` directly, components don't call `fetch` directly

### Closing the task

- Update the task's **Status** to `Complete`
- Record the completion date
- List all files created and modified (see `rbac-implementation.md` for an example)
- Move the file to `docs/tasks/completed/`
- If the task was only partially completed, update the status to note which phases are done and which remain

## 5. Lessons and Anti-Patterns

These are common mistakes to watch for in this project:

- **Always use the Result pattern.** Every service method must return `Promise<Result<T>>` using `tryCatch()`. Controllers then check `result.ok` and branch accordingly. If you find yourself writing `try/catch` in a controller, stop — the service handles errors internally via `tryCatch()`, and the controller only inspects the result.
- **Express response helpers need `void`.** `return res.status(200).json(data)` causes a TypeScript error because `res.json()` returns `Response`, not `void`. Always write `return void res.status(200).json(data)`.
- **Drizzle schema !== database.** Changing a `.ts` schema file does NOT change PostgreSQL. You must generate and apply a migration. If you forget, the app compiles but crashes at runtime with "column X does not exist."
- **Shared package changes are invisible until built.** `packages/shared` is imported by alias (`@fullstack-template/shared`). After editing it, run `pnpm build` before testing the apps, or the apps will use the stale compiled output.
- **Zod v4 is a different import path.** This project uses `zod/v4`, not `zod`. They have different APIs. If you import from `zod`, you'll get v3 behavior and `z.prettifyError` won't exist.
- **Docker must be running for database operations.** `pnpm db:migrate`, `pnpm db:seed`, and `pnpm dev:api` all need PostgreSQL. If Docker isn't running, you get a connection refused error, not a helpful message.
- **`pnpm test` runs Vitest, not Jest.** Test files use Vitest conventions (`vi.fn()`, `vi.mock()`, `describe`/`it`/`expect` from globals). Don't mix in Jest APIs.
- **Route ordering matters in Express.** Parameterized routes (`:id`) must come after specific routes (`/me`, `/search`) or the specific paths get swallowed. Check route order in the router file.
- **Pino logger is structured.** Pass context as a second argument object: `logger.error('Failed', { error: result.error.toString(), userId })`. Don't template-string data into the message.
