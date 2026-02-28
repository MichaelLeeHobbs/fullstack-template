# ADR-007: Zod v4 Validation

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | validation, backend, frontend, shared |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

User input must be validated at the API boundary before reaching business logic. The validation library should produce TypeScript types from schema definitions (avoiding the duplication of writing both a validator and an interface), generate user-friendly error messages, and work on both server and client. The template validates request bodies, query parameters, path parameters, and configuration environment variables.

## Decision

Use Zod v4 as the sole validation library across the entire stack. Import exclusively from the `zod/v4` path (not `zod` which resolves to v3):

```typescript
import { z } from 'zod/v4';
```

Validation patterns:
- **Request validation** uses `schema.safeParse(req.body)` in controllers. Failed validation returns a 400 response with `z.prettifyError(result.error)` for human-readable field-level errors.
- **Type inference** uses `z.infer<typeof schema>` to derive TypeScript types from schemas, eliminating duplicate type definitions.
- **Shared schemas** in `packages/shared` define common types (user preferences, API response shapes) used by both frontend and backend.
- **UUID validation** uses `.uuid()` which validates RFC 4122 format -- test fixtures must use valid v4 UUIDs (version nibble `4`, variant bits `8/9/a/b`).

Validation always happens in the controller layer (or validation middleware), never in services. Services receive already-validated, typed arguments.

## Consequences

### Positive

- Single source of truth for validation rules and TypeScript types -- schemas define both
- `prettifyError` produces human-readable error messages suitable for API responses without custom formatting
- Same library on frontend and backend enables shared schema definitions in the monorepo
- Composable schema API (`.extend()`, `.pick()`, `.merge()`) allows building complex validators from simple ones

### Negative

- The `zod/v4` import path is non-obvious and easy to confuse with the default `zod` import (v3) -- requires linting or code review to enforce
- Zod v4 has stricter UUID validation than v3, which breaks naive test fixtures using fake UUIDs
- Bundle size impact on the frontend (~12KB gzipped), though this is acceptable for the validation capability
- Complex conditional validation (discriminated unions, refinements with cross-field dependencies) can produce verbose schema definitions

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Joi | Mature, battle-tested, rich validation rules | No TypeScript type inference, Node-only, larger bundle | Rejected |
| Yup | Popular in React ecosystem, TypeScript support | Weaker type inference than Zod, less composable | Rejected |
| AJV (JSON Schema) | Standards-based, extremely fast | No TypeScript inference, verbose JSON schema syntax, poor DX | Rejected |
| class-validator (decorators) | Integrates with class-based patterns | Requires classes and decorators, does not fit functional style | Rejected |
| **Zod v4** | TypeScript inference, composable, isomorphic, prettifyError, active development | v4 import path confusion, strict UUID validation | **Selected** |
