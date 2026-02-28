# ADR-004: RBAC with Permission-Based Access Control

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | auth, rbac, permissions, security |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The application needs fine-grained access control beyond simple admin/non-admin checks. Different users need different levels of access to resources: some can manage certificates but not users, others can view audit logs but not modify roles. A hardcoded role check approach (`if (user.role === 'admin')`) does not scale -- every new capability requires code changes. The authorization system must support custom roles for organizations that deploy this template with their own access policies.

## Decision

Implement a three-tier RBAC system: **Users -> Roles -> Permissions**.

- **Permissions** are atomic capabilities identified by string keys following a `resource:action` naming convention (e.g., `users:read`, `certificates:create`, `audit:view`). Permissions are seeded and immutable at the application level.
- **Roles** are named collections of permissions. Two system roles are immutable and cannot be deleted or renamed: `admin` (all permissions) and `user` (baseline permissions). Additional custom roles can be created via the admin UI.
- **User-Roles** is a many-to-many join table. A user's effective permission set is the union of all permissions from all their assigned roles.

Authorization enforcement uses a `requirePermission('resource:action')` middleware in the router layer. The middleware reads the user's permission array from the JWT access token (populated at login/refresh from the role-permission graph) and checks for inclusion. No database lookup is needed for authorization checks on normal requests.

Permission sets are refreshed when:
- A new access token is issued via refresh
- An admin modifies a user's roles (the user's next token refresh picks up changes)

## Consequences

### Positive

- New features only require adding permission seeds -- no code changes to the authorization framework
- Custom roles allow deployments to define access policies without forking the codebase
- Permission checks are O(1) lookups against the JWT claims array -- no database round-trip
- The `resource:action` convention is self-documenting and searchable across the codebase

### Negative

- Permission changes are not instant -- they take effect at the next token refresh (up to 15 minutes for access token expiry)
- The permission array in the JWT grows with the number of assigned permissions, increasing token size
- Role-permission graph must be carefully seeded and migrated when new permissions are added
- Revoking a role does not immediately revoke access if the user has a valid access token

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Simple admin/user boolean | Minimal complexity | No granularity, every new capability needs code changes | Rejected |
| ACL per resource (access control lists) | Fine-grained per-object control | Complex to manage, expensive to check, overkill for most apps | Rejected |
| ABAC (attribute-based) | Extremely flexible policy rules | Complex policy engine, harder to reason about, over-engineered for template | Rejected |
| Casbin policy engine | Powerful, supports multiple models | External dependency for core auth, complex configuration DSL | Rejected |
| **RBAC with permissions in JWT** | Granular, no auth DB lookups, custom roles, simple mental model | Delayed revocation, token size growth | **Selected** |
