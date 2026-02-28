# ADR-014: Shared Package Consolidation

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-02-28 |
| **Tags** | types, shared, monorepo, imports |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The `@fullstack-template/shared` package existed to share types and validation between `apps/api` and `apps/web`, but was severely underutilized. It only exported auth form schemas and a handful of basic types, while ~500 lines of domain types were duplicated across the frontend (`apps/web/src/types/`) and the backend had its own copy of the `PERMISSIONS` constant. This created drift risk and maintenance burden.

Specific problems:
- `PERMISSIONS` constant defined in three places (API seeds, web `types/role.ts`, web `types/pki.ts`)
- `User` type too minimal in shared vs. the real shape used by the frontend
- Domain entity types (PKI, Role, ApiKey) defined only in `apps/web/src/types/`
- `PaginatedResponse` defined locally instead of shared
- Input types duplicated between shared schemas and manual interfaces

## Decision

Consolidate all shared domain types, API response types, and constants into `@fullstack-template/shared`. Delete the `apps/web/src/types/` directory and update all consumers to import from the shared package.

### Package Structure

```
packages/shared/src/
├── index.ts                    # Barrel export
├── constants/
│   └── permissions.ts          # PERMISSIONS const + PermissionName type
├── schemas/
│   └── auth.schema.ts          # Form validation schemas (frontend)
└── types/
    ├── api.ts                  # ApiResponse, ApiError, PaginatedResponse
    ├── auth.ts                 # User, AuthTokens, AuthResponse
    ├── role.ts                 # Permission, Role, input types
    ├── api-key.ts              # ApiKey, ServiceAccount, input types
    ├── pki.ts                  # CA, Certificate, Profile, CSR, CRL types
    └── admin.ts                # AuditLog, Setting types
```

### Schema Separation

Backend and shared auth schemas are intentionally kept separate:
- Shared schemas have `confirmPassword` + `refine()` for frontend form validation
- Backend schemas omit `confirmPassword` for server request validation
- API layer uses `Omit<RegisterInput, 'confirmPassword'>` where needed

## Consequences

### Positive
- Single source of truth for domain types and permission constants
- No more drift between frontend and backend type definitions
- Eliminated ~500 lines of duplicated type code
- Clear import convention: domain types come from `@fullstack-template/shared`

### Negative
- Shared package must be built before API or web can type-check
- Adding a new domain type requires touching the shared package

### Neutral
- Shared package build is fast (pure TypeScript declarations, no bundling)
- pnpm workspace handles dependency ordering automatically
