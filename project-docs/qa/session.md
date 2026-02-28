# Test Cases: Session Management

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-SESSION-001 through US-SESSION-008

## Session Listing

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-SESSION-001 | List sessions returns active sessions | User authenticated with at least one active session | 1. GET `/api/sessions` with valid authentication | 200 OK; response contains array of active sessions including current session; each session has id, createdAt, lastActiveAt | US-SESSION-001 | P0 | Yes |
| TC-SESSION-002 | Session includes IP and user agent | User authenticated; session created from known client | 1. GET `/api/sessions` with valid authentication 2. Inspect session objects in response | 200 OK; each session object includes ipAddress and userAgent fields matching the originating request | US-SESSION-002 | P1 | Yes |

## Session Revocation

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-SESSION-003 | Revoke specific session | User authenticated with multiple active sessions | 1. GET `/api/sessions` to obtain a non-current session ID 2. DELETE `/api/sessions/:id` with that session ID | 200 OK; targeted session is revoked; session no longer appears in list | US-SESSION-003 | P0 | Yes |
| TC-SESSION-004 | Cannot revoke current session | User authenticated | 1. Identify current session ID from session list 2. DELETE `/api/sessions/:id` with current session ID | 400 Bad Request; error indicates cannot revoke the current active session; use logout instead | US-SESSION-004 | P1 | Yes |
| TC-SESSION-005 | Revoke non-existent session | User authenticated | 1. DELETE `/api/sessions/:id` with a UUID that does not correspond to any session | 404 Not Found; error indicates session not found | US-SESSION-005 | P1 | Yes |
| TC-SESSION-006 | Revoke all other sessions | User authenticated with multiple active sessions | 1. POST `/api/sessions/revoke-all` with valid authentication | 200 OK; all sessions except the current one are revoked | US-SESSION-006 | P0 | Yes |
| TC-SESSION-007 | After revoke-all only current session remains | User authenticated with 3+ active sessions | 1. POST `/api/sessions/revoke-all` 2. GET `/api/sessions` to list remaining sessions | 200 OK; session list contains exactly one session (the current session) | US-SESSION-006 | P0 | Yes |
| TC-SESSION-008 | Revoked session's refresh token no longer works | User has a second session with known refresh token | 1. Revoke the second session via DELETE `/api/sessions/:id` 2. POST `/api/auth/refresh` with the revoked session's refresh token | Revocation returns 200; refresh attempt returns 401 Unauthorized; token is no longer valid | US-SESSION-007 | P0 | Yes |
