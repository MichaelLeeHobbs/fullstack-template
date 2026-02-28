# ADR-008: Zustand State Management

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | frontend, state, react |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The React frontend needs global state management for cross-cutting concerns that do not fit naturally into component-local state or server state (handled by TanStack Query). Specifically: authentication state (current user, access token, MFA flow state), theme preferences (dark/light mode with persistence), notification state (real-time notification counts and toasts), and Socket.IO connection state. The state solution must be TypeScript-first, lightweight, and avoid the Provider wrapper pattern that adds component tree complexity.

## Decision

Use Zustand for all client-side global state. Each concern gets its own store file in `src/stores/`:

- **auth.store.ts** -- User object, access token, MFA temp token, authentication status, and actions (setAuth, clearAuth, setMfaRequired)
- **theme.store.ts** -- Dark/light mode preference with `persist` middleware for localStorage survival across sessions
- **notification.store.ts** -- Unread notification count and toast queue for real-time updates
- **socket.store.ts** -- Socket.IO connection state and reconnection status

Stores are created with `create<StateType>()()` and consumed directly in components via the hook selector pattern: `const user = useAuthStore((s) => s.user)`. No `<Provider>` wrappers are needed.

Server state (API data like user lists, certificate data, audit logs) is managed exclusively by TanStack Query hooks -- Zustand is not used for cacheable server data.

## Consequences

### Positive

- Zero Provider boilerplate -- stores are importable functions, no component tree wrappers
- Selector-based consumption means components only re-render when their selected slice changes
- `persist` middleware handles localStorage serialization for theme preferences with no manual code
- Stores are plain objects with functions, easily testable without React rendering
- Tiny bundle size (~1KB gzipped) compared to Redux (~7KB) or MobX (~15KB)

### Negative

- No built-in devtools equivalent to Redux DevTools (Zustand devtools middleware exists but is less mature)
- No middleware ecosystem comparable to Redux (redux-saga, redux-observable) for complex async flows
- Multiple stores can lead to implicit coupling if stores reference each other -- requires discipline to keep stores independent
- Persistence middleware serializes to JSON, which loses Date objects and requires careful handling of non-serializable state

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Redux Toolkit | Mature, excellent devtools, large ecosystem | Heavy boilerplate (slices, reducers, selectors), Provider required, larger bundle | Rejected |
| MobX | Reactive, minimal boilerplate, observable patterns | Proxy-based magic, harder to debug, larger bundle, decorator-heavy | Rejected |
| React Context + useReducer | No external dependency | Re-renders all consumers on any state change, Provider nesting, poor performance at scale | Rejected |
| Jotai | Atomic model, bottom-up, minimal | Different mental model (atoms), requires Provider, less intuitive for auth/theme stores | Rejected |
| **Zustand** | Minimal API, no Provider, selector-based renders, persist middleware, TypeScript-first | Smaller ecosystem, no mature devtools | **Selected** |
