# ADR-003: JWT Dual-Token Authentication

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | auth, security, jwt, sessions |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The application needs stateless authentication that scales horizontally without shared session storage, while still supporting token revocation for security events (password changes, admin lockout, suspicious activity). A single long-lived JWT is insecure (stolen tokens grant extended access), while a single short-lived JWT forces frequent re-authentication that degrades user experience. The system also needs to integrate with MFA (ADR-010) and support certificate-based login (ADR-009).

## Decision

Implement a dual-token JWT strategy with complementary lifetimes and storage mechanisms:

- **Access token** (15-minute expiry): A signed JWT containing user ID, email, admin flag, and permissions. Stored in application memory on the frontend (Zustand auth store). Sent as `Authorization: Bearer <token>` header on every API request. Short lifetime limits exposure if intercepted.
- **Refresh token** (7-day expiry): A cryptographically random token, SHA-256 hashed before database storage in the `sessions` table. Delivered as an HttpOnly cookie (see ADR-011). Used exclusively to obtain new access tokens via the `/auth/refresh` endpoint.

Token lifecycle:
1. Login produces both tokens; the refresh token creates a `sessions` row with device metadata (user agent, IP)
2. API requests use the access token; expired tokens return 401
3. The frontend silently calls `/auth/refresh` to obtain a new access token before expiry
4. Logout or revocation deletes the session row, invalidating the refresh token
5. Password changes invalidate all sessions for the user

The raw refresh token is never stored server-side -- only its SHA-256 hash. This means a database breach does not expose usable refresh tokens.

## Consequences

### Positive

- Access tokens are stateless -- no database lookup required for most API requests
- Refresh tokens are revocable per-session, enabling "sign out other devices"
- 15-minute access token lifetime limits the window of a stolen token
- Hashing refresh tokens before storage provides defense-in-depth against database compromise
- Session metadata enables the "active sessions" management UI

### Negative

- Requires a database lookup on every refresh, adding latency to token renewal
- Frontend must implement silent refresh logic with retry and race condition handling
- Two-token flows increase complexity for API consumers and debugging
- Clock skew between server and client can cause premature or delayed token expiry

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Session cookies (server-side sessions) | Simple, revocable, well-understood | Requires sticky sessions or shared session store for horizontal scaling | Rejected |
| Single long-lived JWT | Simplest implementation | Cannot revoke, long exposure window | Rejected |
| Single short-lived JWT + re-login | Minimal complexity | Poor UX, frequent authentication prompts | Rejected |
| OAuth 2.0 with external IdP | Delegated auth, standards-based | Overkill for a self-contained template, external dependency | Rejected |
| **Dual JWT (access + refresh)** | Stateless reads, revocable refresh, horizontal scaling | Token refresh complexity, two-token management | **Selected** |
