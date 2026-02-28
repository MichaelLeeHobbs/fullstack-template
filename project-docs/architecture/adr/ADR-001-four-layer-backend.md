# ADR-001: Four-Layer Backend Architecture

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | backend, architecture, separation-of-concerns |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The backend needs a clear, consistent structure that separates HTTP concerns from business logic and data access. Without enforced layering, Express applications tend to accumulate "fat controllers" where route handlers directly query the database, mix validation with business rules, and become difficult to test in isolation. As the template grows to include authentication, RBAC, PKI, and background jobs, a predictable request flow is essential for maintainability and onboarding.

## Decision

Adopt a strict four-layer architecture for all backend request handling:

1. **Router** (`src/routes/`) -- Defines route paths, attaches middleware (auth, validation, permissions), and delegates to controllers. Contains zero business logic.
2. **Controller** (`src/controllers/`) -- Parses and validates the HTTP request, calls one or more service methods, and formats the HTTP response. Never accesses the database directly.
3. **Service** (`src/services/`) -- Contains all business logic. Returns `Result<T>` via `tryCatch()`. Has no knowledge of Express (no `req`/`res` objects). May call other services or the database layer.
4. **Model** (`src/db/schema/`) -- Drizzle ORM schema definitions, column types, relations, and exported TypeScript types. Pure data structure definitions with no behavior.

Supporting layers exist outside the request path: **Providers** for external integrations (S3, email SMTP), **Jobs** for background processing, and **Libs** for shared infrastructure (database connection, logger, JWT utilities).

## Consequences

### Positive

- Services are unit-testable without HTTP mocking -- they accept plain arguments and return `Result<T>`
- Controllers are testable with lightweight request/response mocks without needing a real database
- New developers can locate code predictably: HTTP concerns in controllers, business rules in services
- Swapping Express for another framework (Fastify, Hono) only requires rewriting routers and controllers

### Negative

- Simple CRUD operations require touching four files (router, controller, service, schema), which adds boilerplate for trivial endpoints
- Developers must resist the temptation to add "just one query" in a controller, requiring code review discipline
- The indirection can feel excessive for a small team or early-stage prototype

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Fat controllers (route + logic in one file) | Less boilerplate, faster to write | Untestable, hard to reuse logic, grows unwieldy | Rejected |
| Three-layer (Router, Controller+Service, Model) | Fewer files per feature | Blurs HTTP and business logic, harder to test | Rejected |
| NestJS-style decorators | Enforces structure via framework | Heavy framework lock-in, decorator complexity, larger bundle | Rejected |
| **Four-layer (Router, Controller, Service, Model)** | Clear separation, testable layers, framework-agnostic services | More files per feature | **Selected** |
