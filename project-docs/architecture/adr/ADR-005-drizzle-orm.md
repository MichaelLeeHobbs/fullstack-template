# ADR-005: Drizzle ORM

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | database, orm, postgresql, backend |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The application uses PostgreSQL and needs a TypeScript data access layer that provides type safety, a migration system, and reasonable query ergonomics. The ideal ORM should feel close to SQL (so developers can reason about what queries are generated), produce minimal runtime overhead, and support advanced PostgreSQL features like JSON columns, composite primary keys, and custom indexes. The template includes complex schemas spanning users, sessions, roles, permissions, PKI certificate hierarchies, and audit logs -- the ORM must handle these without fighting the tool.

## Decision

Use Drizzle ORM as the sole data access layer. Schemas are defined in `src/db/schema/` using Drizzle's `pgTable()` builder with TypeScript column types. Queries use Drizzle's SQL-like chainable API (`db.select().from(table).where(eq(...))`) rather than a repository or active record pattern.

Key conventions:
- Schema files export both the table definition and inferred TypeScript types (`type User = typeof users.$inferSelect`)
- Relations are defined alongside schemas for use with Drizzle's relational query API
- Migrations are generated via `pnpm db:generate` (which runs `drizzle-kit generate`) and applied via `pnpm db:migrate`
- The database connection is a singleton in `src/lib/db.ts` using `drizzle(pool)` with `node-postgres`
- Transactions use `db.transaction(async (tx) => { ... })` with the same query API

## Consequences

### Positive

- Query syntax mirrors SQL, so the generated queries are predictable and debuggable
- TypeScript types are inferred directly from schema definitions -- no code generation step or separate type files
- Lightweight runtime (~50KB) with no reflection or decorator dependencies
- Migration files are plain SQL, reviewable in PRs and safe to modify manually
- Drizzle Studio provides a visual database browser for development

### Negative

- Drizzle's relational query API is less mature than Prisma's includes -- deeply nested eager loading requires manual joins
- Smaller ecosystem compared to Prisma or TypeORM (fewer community plugins, StackOverflow answers)
- Schema changes require running `db:generate` then `db:migrate`, and the build must succeed before generation (TypeScript compilation is a prerequisite)
- Index syntax has changed across Drizzle versions, requiring attention during upgrades

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Prisma | Large ecosystem, excellent DX, visual studio | Heavy client generation, opaque query engine binary, schema DSL instead of TypeScript | Rejected |
| TypeORM | Mature, decorator-based, active record option | Decorator complexity, inconsistent TypeScript types, slower development pace | Rejected |
| Knex (query builder only) | Lightweight, SQL-close, well-established | No schema type inference, manual type management, no built-in migration generation from schema | Rejected |
| Kysely | Type-safe query builder, lightweight | No schema-first definition, less opinionated migration story | Rejected |
| **Drizzle ORM** | SQL-like syntax, TypeScript-inferred types, lightweight, plain SQL migrations | Smaller ecosystem, schema-build dependency, evolving API | **Selected** |
