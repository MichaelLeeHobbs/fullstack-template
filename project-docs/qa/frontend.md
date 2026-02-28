# Test Cases: Frontend

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-FRONTEND-001 through US-FRONTEND-010

## Theme Management

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-FRONTEND-001 | Dark mode toggle switches theme | Application loaded in light mode | 1. Locate the theme toggle control in the UI 2. Click the dark mode toggle | UI switches to dark theme; background changes to dark color palette; text changes to light color; toggle reflects new state | US-FRONTEND-001 | P1 | No |
| TC-FRONTEND-002 | Theme persists across page reload | Theme set to dark mode | 1. Set theme to dark mode via toggle 2. Reload the page (F5 or browser refresh) | After reload, application renders in dark mode; theme preference was persisted to localStorage or equivalent store | US-FRONTEND-002 | P1 | No |
| TC-FRONTEND-003 | System theme follows OS preference | OS is set to dark mode; app theme set to "system" | 1. Set application theme to "system" or "auto" 2. Verify the rendered theme matches the OS preference | Application renders in dark mode matching the OS setting; if OS preference changes, app theme updates accordingly | US-FRONTEND-003 | P2 | No |

## Responsive Layout

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-FRONTEND-004 | Sidebar collapses on mobile viewport | Application loaded on desktop with sidebar visible | 1. Resize browser window to mobile breakpoint (below 768px) or use device emulation | Sidebar collapses to a hamburger menu or hidden state; main content area occupies full width | US-FRONTEND-004 | P1 | No |
| TC-FRONTEND-005 | Responsive layout at mobile breakpoint | Application loaded | 1. Set viewport to 375px width (mobile) 2. Navigate through main pages (dashboard, settings, profile) | All pages render without horizontal overflow; content is stacked vertically; touch targets are adequately sized; no overlapping elements | US-FRONTEND-005 | P1 | No |

## Error Handling

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-FRONTEND-006 | Error boundary catches component errors | Application loaded | 1. Trigger a runtime error in a component (e.g., navigate to a route with a deliberately broken component in test environment) | Error boundary catches the error; fallback UI is displayed instead of a blank screen; error message is user-friendly | US-FRONTEND-006 | P0 | Yes |
| TC-FRONTEND-007 | Error boundary shows retry option | Error boundary has been triggered | 1. Observe the error boundary fallback UI 2. Click the retry or reload button | Retry button is visible and clickable; clicking it attempts to re-render the component or reload the page | US-FRONTEND-007 | P1 | No |

## Form Validation

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-FRONTEND-008 | Login form validates before submit | Login page loaded | 1. Leave email field empty 2. Leave password field empty 3. Click the login/submit button | Form does not submit; validation errors are displayed inline for required fields; no API request is made | US-FRONTEND-008 | P0 | No |
| TC-FRONTEND-009 | Registration form shows password requirements | Registration page loaded | 1. Navigate to the registration form 2. Focus on the password field or begin typing | Password requirements are displayed (minimum 8 characters, uppercase letter, number); requirements update dynamically as user types showing which are met | US-FRONTEND-009 | P1 | No |

## Loading States

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-FRONTEND-010 | Loading states displayed during API calls | Application loaded; user authenticated | 1. Navigate to a page that fetches data from the API (e.g., dashboard or user list) 2. Observe the UI while data is loading (throttle network if needed) | Loading indicator (spinner, skeleton, or progress bar) is displayed while data is being fetched; indicator disappears when data loads; UI does not flash or jump | US-FRONTEND-010 | P1 | No |
