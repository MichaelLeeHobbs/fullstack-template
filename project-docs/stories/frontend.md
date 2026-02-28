# Frontend User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-FRONTEND-001: Dark Mode

| Field | Value |
|-------|-------|
| **Priority** | P2 - Medium |
| **Status** | Implemented |
| **Endpoints** | N/A (client-side only) |
| **Components** | ThemeToggle, PreferencesCard (ProfilePage), useTheme hook, theme.store.ts |

**As a** user, **I want to** toggle between light, dark, and system-preferred themes, **so that** I can use the application in a visual mode that is comfortable for my environment.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can switch between light, dark, and system theme modes via the ThemeToggle component | TC-FRONTEND-001 |
| 2 | Theme preference is persisted in local storage and restored on page reload | TC-FRONTEND-002 |
| 3 | System mode automatically follows the operating system's dark/light preference | TC-FRONTEND-003 |
| 4 | Material UI theme is applied consistently across all components | TC-FRONTEND-004 |
| 5 | Theme toggle is accessible from the ProfilePage PreferencesCard | TC-FRONTEND-005 |
| 6 | Theme state is managed globally via Zustand theme store | TC-FRONTEND-006 |
| 7 | Theme transitions are smooth without page flicker | TC-FRONTEND-007 |

---

## US-FRONTEND-002: Responsive Layout

| Field | Value |
|-------|-------|
| **Priority** | P2 - Medium |
| **Status** | Implemented |
| **Endpoints** | N/A (client-side only) |
| **Components** | AppLayout, Sidebar, TopNav, PublicLayout, Footer |

**As a** user accessing the application from different devices, **I want** the layout to adapt to my screen size with a collapsible sidebar, **so that** I have a usable interface on both desktop and mobile.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Desktop view displays a persistent sidebar navigation and top navigation bar | TC-FRONTEND-008 |
| 2 | Sidebar can be collapsed/expanded by the user | TC-FRONTEND-009 |
| 3 | Mobile view hides the sidebar and provides a hamburger menu or drawer | TC-FRONTEND-010 |
| 4 | All pages render correctly at common breakpoints (mobile, tablet, desktop) | TC-FRONTEND-011 |
| 5 | Public pages (login, register, landing) use the PublicLayout without sidebar | TC-FRONTEND-012 |
| 6 | Authenticated pages use the AppLayout with sidebar, top nav, and footer | TC-FRONTEND-013 |
| 7 | Navigation items are conditionally rendered based on user permissions | TC-FRONTEND-014 |

---

## US-FRONTEND-003: Error Boundary

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | N/A (client-side only) |
| **Components** | ErrorBoundary |

**As a** user, **I want** the application to gracefully handle unexpected errors and display a friendly error message with a retry option, **so that** I am not left with a blank screen or cryptic error.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | React ErrorBoundary catches unhandled exceptions in child components | TC-FRONTEND-015 |
| 2 | A user-friendly error message is displayed instead of a blank screen or stack trace | TC-FRONTEND-016 |
| 3 | A "Try Again" or retry button is provided to attempt recovery | TC-FRONTEND-017 |
| 4 | Error details are logged for debugging purposes | TC-FRONTEND-018 |
| 5 | ErrorBoundary wraps the main application route tree | TC-FRONTEND-019 |
| 6 | Navigation errors and API failures do not crash the entire application | TC-FRONTEND-020 |
| 7 | 404 Not Found pages render a dedicated NotFoundPage component | TC-FRONTEND-021 |

---
