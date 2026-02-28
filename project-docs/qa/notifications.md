# Test Cases: Notifications

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-NOTIFY-001 through US-NOTIFY-008

## Notification Listing

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-NOTIFY-001 | List notifications | User authenticated; notifications exist for user | 1. GET `/api/notifications` with valid authentication | 200 OK; response contains array of notifications ordered by newest first, each with id, type, title, message, isRead, createdAt | US-NOTIFY-001 | P0 | Yes |
| TC-NOTIFY-002 | Get unread notification count | User authenticated; some notifications are unread | 1. GET `/api/notifications/unread-count` with valid authentication | 200 OK; response contains count field with numeric value matching the number of unread notifications | US-NOTIFY-002 | P0 | Yes |

## Notification Actions

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-NOTIFY-003 | Mark single notification as read | User authenticated; unread notification exists | 1. PATCH `/api/notifications/:id/read` with valid notification ID | 200 OK; notification isRead set to true; unread count decremented by one | US-NOTIFY-003 | P0 | Yes |
| TC-NOTIFY-004 | Mark all notifications as read | User authenticated; multiple unread notifications exist | 1. POST `/api/notifications/mark-all-read` with valid authentication | 200 OK; all user's notifications set to isRead=true; unread count becomes zero | US-NOTIFY-004 | P0 | Yes |
| TC-NOTIFY-005 | Delete notification | User authenticated; notification exists | 1. DELETE `/api/notifications/:id` with valid notification ID | 200 OK; notification is permanently removed; no longer appears in notification list | US-NOTIFY-005 | P1 | Yes |

## Notification Content

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-NOTIFY-006 | Notification includes type, title, and message | User authenticated; notification exists | 1. GET `/api/notifications` 2. Inspect a notification object in the response | Each notification contains non-empty type (e.g., "info", "warning", "error"), title string, and message string | US-NOTIFY-006 | P1 | Yes |

## Real-Time Notifications

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-NOTIFY-007 | Real-time notification via Socket.IO | User connected to Socket.IO with valid authentication | 1. Establish Socket.IO connection with auth token 2. Trigger an action that generates a notification (e.g., admin disables account) 3. Listen for notification event on socket | Socket receives notification event with payload containing type, title, and message matching the triggered notification | US-NOTIFY-007 | P0 | No |
| TC-NOTIFY-008 | Unread count updates after marking read | User authenticated; unread notifications exist | 1. GET `/api/notifications/unread-count` to get initial count 2. PATCH `/api/notifications/:id/read` to mark one notification read 3. GET `/api/notifications/unread-count` to get updated count | Updated count equals initial count minus one; count accurately reflects current unread state | US-NOTIFY-008 | P1 | Yes |
