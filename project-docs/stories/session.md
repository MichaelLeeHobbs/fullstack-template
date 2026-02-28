# Session Management User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-SESSION-001: View Sessions

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/sessions |
| **Components** | SessionsPage, SessionController.list(), SessionService, useSessions hook |

**As a** logged-in user, **I want to** view all my active sessions with device and IP information, **so that** I can monitor where my account is being used.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Authenticated user can retrieve a list of all their active sessions | TC-SESSION-001 |
| 2 | Each session includes device/user-agent information | TC-SESSION-002 |
| 3 | Each session includes the IP address from which it was created | TC-SESSION-003 |
| 4 | The current session is identifiable in the list | TC-SESSION-004 |
| 5 | Sessions are ordered by creation date (most recent first) | TC-SESSION-005 |
| 6 | Unauthenticated requests return 401 Unauthorized | TC-SESSION-006 |

---

## US-SESSION-002: Revoke Session

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | DELETE /api/v1/sessions/:id |
| **Components** | SessionsPage (revoke button), SessionController.revoke(), SessionService, useSessions hook |

**As a** logged-in user, **I want to** revoke a specific session by its ID, **so that** I can terminate access from a device I no longer trust.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can revoke a specific session by providing its UUID | TC-SESSION-007 |
| 2 | Revoked session's refresh token is invalidated immediately | TC-SESSION-008 |
| 3 | User cannot revoke their own current session (returns 400 Bad Request) | TC-SESSION-009 |
| 4 | Revoking a non-existent session returns 404 Not Found | TC-SESSION-010 |
| 5 | Session ID must be a valid UUID (validated by schema) | TC-SESSION-011 |
| 6 | Users can only revoke their own sessions, not other users' sessions | TC-SESSION-012 |

---

## US-SESSION-003: Revoke All Sessions

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | DELETE /api/v1/sessions |
| **Components** | SessionsPage (revoke all button), SessionController.revokeAll(), SessionService, useSessions hook |

**As a** logged-in user, **I want to** revoke all my sessions except the current one, **so that** I can sign out from all other devices at once if I suspect unauthorized access.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can revoke all sessions except the current one with a single request | TC-SESSION-013 |
| 2 | The current session remains active and is not revoked | TC-SESSION-014 |
| 3 | All other sessions' refresh tokens are invalidated immediately | TC-SESSION-015 |
| 4 | Response confirms success with `{ success: true }` | TC-SESSION-016 |
| 5 | Unauthenticated requests return 401 Unauthorized | TC-SESSION-017 |

---
