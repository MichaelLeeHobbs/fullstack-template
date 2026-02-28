# Notification User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-NOTIFY-001: Receive Notification

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/notifications |
| **Components** | NotificationMenu, NotificationController.list(), NotificationService, useNotifications hook, useSocket hook, socket.store.ts |

**As a** logged-in user, **I want to** receive real-time notifications via Socket.IO and see them in my notification list, **so that** I am immediately informed of important system events.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Notifications are delivered in real-time via Socket.IO to connected clients | TC-NOTIFY-001 |
| 2 | Notifications are persisted in the database for retrieval when the user is offline | TC-NOTIFY-002 |
| 3 | User can retrieve a paginated list of notifications via GET /api/v1/notifications | TC-NOTIFY-003 |
| 4 | Notification list supports query parameters for pagination (page, limit) | TC-NOTIFY-004 |
| 5 | Each notification includes type, title, message, read status, and timestamp | TC-NOTIFY-005 |
| 6 | Only the authenticated user's notifications are returned (scoped to user) | TC-NOTIFY-006 |
| 7 | Individual notifications can be deleted via DELETE /api/v1/notifications/:id | TC-NOTIFY-007 |

---

## US-NOTIFY-002: Mark Read

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | PATCH /api/v1/notifications/:id/read, PATCH /api/v1/notifications/read-all |
| **Components** | NotificationMenu, NotificationController.markRead(), NotificationController.markAllRead(), NotificationService, useNotifications hook |

**As a** logged-in user, **I want to** mark individual or all notifications as read, **so that** I can keep track of which notifications I have already reviewed.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can mark a specific notification as read via PATCH /api/v1/notifications/:id/read | TC-NOTIFY-008 |
| 2 | User can mark all notifications as read via PATCH /api/v1/notifications/read-all | TC-NOTIFY-009 |
| 3 | Marking as read updates the notification's `readAt` timestamp | TC-NOTIFY-010 |
| 4 | Already-read notifications are not affected by subsequent read requests | TC-NOTIFY-011 |
| 5 | Notification ID must be a valid UUID (validated by schema) | TC-NOTIFY-012 |
| 6 | Users can only mark their own notifications as read | TC-NOTIFY-013 |

---

## US-NOTIFY-003: Bell Badge

| Field | Value |
|-------|-------|
| **Priority** | P2 - Medium |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/notifications/unread-count |
| **Components** | NotificationBell (TopNav), NotificationController.unreadCount(), NotificationService, useNotifications hook, notification.store.ts |

**As a** logged-in user, **I want to** see a badge on the notification bell icon showing my unread notification count, **so that** I know at a glance if there are new notifications requiring my attention.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Unread notification count is available via GET /api/v1/notifications/unread-count | TC-NOTIFY-014 |
| 2 | NotificationBell component displays the unread count as a badge in the top navigation bar | TC-NOTIFY-015 |
| 3 | Badge is hidden when the unread count is zero | TC-NOTIFY-016 |
| 4 | Unread count updates in real-time when a new notification arrives via Socket.IO | TC-NOTIFY-017 |
| 5 | Unread count decreases when a notification is marked as read | TC-NOTIFY-018 |
| 6 | Unread count resets to zero when "mark all read" is used | TC-NOTIFY-019 |
| 7 | Notification state is managed via Zustand notification store for global access | TC-NOTIFY-020 |

---
