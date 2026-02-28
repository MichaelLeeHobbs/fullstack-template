# Frontend Testing Patterns

> **[Template]** This covers the base template feature. Extend or modify for your project.

This guide covers testing patterns for the React frontend, including Zustand store testing, hook testing with `renderHook`, component testing, and mocking the API client.

---

## Overview

Frontend tests run in a `jsdom` environment using Vitest with the `@vitejs/plugin-react` plugin. Tests are co-located with their source files.

```
apps/web/src/
  stores/
    auth.store.ts
    auth.store.test.ts
    theme.store.ts
    theme.store.test.ts
  hooks/
    usePermission.ts
    usePermission.test.ts
    useDebouncedValue.ts
    useDebouncedValue.test.ts
  components/
    MyComponent.tsx
    MyComponent.test.tsx
```

---

## Zustand Store Testing

Zustand stores can be tested directly using `getState()` and `setState()` without rendering any React components. This makes store tests fast and straightforward.

### Basic Store Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store.js';

const mockUser = {
  id: '123',
  email: 'test@example.com',
  isAdmin: false,
  preferences: { theme: 'system' as const },
  permissions: [] as string[],
  createdAt: '2024-01-01T00:00:00Z',
};

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      intendedDestination: null,
    });
  });

  describe('initial state', () => {
    it('should have null user initially', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('setAuth', () => {
    it('should set user and access token', () => {
      const accessToken = 'access-token';

      useAuthStore.getState().setAuth(mockUser, accessToken);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(accessToken);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth state', () => {
      // Set up some state
      useAuthStore.getState().setAuth(mockUser, 'access-token');

      // Clear it
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', () => {
      useAuthStore.getState().setAuth(mockUser, 'access');
      useAuthStore.getState().updatePreferences({ theme: 'dark' });

      const state = useAuthStore.getState();
      expect(state.user?.preferences.theme).toBe('dark');
    });
  });
});
```

### Key Patterns for Store Tests

1. **Reset state in `beforeEach`**: Use `useStore.setState(...)` to reset to the initial state before each test. Without this, state from one test leaks into the next.

2. **Use `getState()` for reading**: Access the current state snapshot with `useStore.getState()`.

3. **Call actions via `getState()`**: Invoke store actions through `useStore.getState().actionName()`.

4. **No React rendering needed**: Store tests do not need `renderHook` or any React rendering utilities.

---

## Hook Testing with `renderHook`

Hooks that use React state, effects, or context must be tested with `renderHook` from `@testing-library/react`.

### Testing a Simple Hook

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '../stores/auth.store.js';
import { usePermission, useAnyPermission, useAllPermissions } from './usePermission.js';

const mockUser = {
  id: '123',
  email: 'test@example.com',
  isAdmin: false,
  preferences: { theme: 'system' as const },
  permissions: ['users:read', 'users:create', 'roles:read'],
  createdAt: '2024-01-01T00:00:00Z',
};

describe('usePermission', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      intendedDestination: null,
    });
  });

  it('should return true when user has the permission', () => {
    const { result } = renderHook(() => usePermission('users:read'));
    expect(result.current).toBe(true);
  });

  it('should return false when user lacks the permission', () => {
    const { result } = renderHook(() => usePermission('users:delete'));
    expect(result.current).toBe(false);
  });
});

describe('useAnyPermission', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      intendedDestination: null,
    });
  });

  it('should return true if user has any of the listed permissions', () => {
    const { result } = renderHook(() =>
      useAnyPermission(['users:delete', 'users:read'])
    );
    expect(result.current).toBe(true);
  });

  it('should return false if user has none of the listed permissions', () => {
    const { result } = renderHook(() =>
      useAnyPermission(['users:delete', 'roles:delete'])
    );
    expect(result.current).toBe(false);
  });
});
```

### Testing Hooks with Timers

For hooks that use `setTimeout` or `setInterval` (like debounce hooks), use `vi.useFakeTimers()`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue.js';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello'));
    expect(result.current).toBe('hello');
  });

  it('should not update value before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toBe('hello');
  });

  it('should update value after delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('world');
  });
});
```

### Testing Hooks with Re-renders

Use `rerender` to simulate prop changes:

```typescript
const { result, rerender } = renderHook(
  ({ userId }) => useUserData(userId),
  { initialProps: { userId: '1' } }
);

// Simulate a prop change
rerender({ userId: '2' });
```

---

## React Component Testing

Component tests use `@testing-library/react` for rendering and user interaction.

### Basic Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm.js';

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should call onSubmit with form data', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });
  });

  it('should show validation error for empty email', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });
});
```

### Testing Components with Providers

Components that rely on context (MUI ThemeProvider, React Router, etc.) need wrapper providers:

```typescript
import { ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';

function renderWithProviders(ui: React.ReactElement) {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </ThemeProvider>
  );
}

it('should render with MUI theme', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

---

## Mocking the API Client

When testing components or hooks that call the API, mock the API client module:

```typescript
import { vi } from 'vitest';

vi.mock('../api/client.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../api/client.js';

it('should display user data after fetch', async () => {
  (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { success: true, data: { id: '1', name: 'Alice' } },
  });

  render(<UserProfile userId="1" />);

  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
```

---

## Mocking Zustand Stores in Component Tests

When testing a component that reads from a Zustand store, set the store state before rendering:

```typescript
import { useAuthStore } from '../stores/auth.store.js';

describe('UserMenu', () => {
  it('should show user email when authenticated', () => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        isAdmin: false,
        preferences: { theme: 'system' },
        permissions: [],
        createdAt: '2024-01-01',
      },
      isAuthenticated: true,
      accessToken: 'token',
      isLoading: false,
      intendedDestination: null,
    });

    render(<UserMenu />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should show login button when not authenticated', () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      isLoading: false,
      intendedDestination: null,
    });

    render(<UserMenu />);

    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});
```

---

## Testing Form Validation

### Testing Client-Side Validation

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('RegistrationForm', () => {
  it('should show error for invalid email', async () => {
    render(<RegistrationForm onSubmit={vi.fn()} />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'not-valid' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should show error for weak password', async () => {
    render(<RegistrationForm onSubmit={vi.fn()} />);

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should disable submit button while submitting', async () => {
    const onSubmit = vi.fn(() => new Promise(() => {})); // Never resolves
    render(<RegistrationForm onSubmit={onSubmit} />);

    // Fill in valid data and submit
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register/i })).toBeDisabled();
    });
  });
});
```

---

## Testing Error States

```typescript
describe('ErrorBoundary', () => {
  it('should display fallback UI when child throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    // Suppress React error boundary console output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    spy.mockRestore();
  });
});
```

---

## Testing TanStack Query Hooks

When testing hooks that use TanStack Query, wrap them in a `QueryClientProvider`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useUsers', () => {
  it('should fetch and return users', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [{ id: '1', name: 'Alice' }] },
    });

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: '1', name: 'Alice' }]);
  });

  it('should handle fetch error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

---

## Configuration Reference

The web Vitest config (`apps/web/vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
    },
  },
});
```

---

## Common Pitfalls

### 1. Store State Leaking Between Tests

Always reset Zustand stores in `beforeEach`. Without this, actions from one test affect the next.

### 2. Missing `act()` for State Updates

When advancing timers or triggering state changes, wrap them in `act()`:

```typescript
act(() => {
  vi.advanceTimersByTime(300);
});
```

### 3. Forgetting `waitFor` on Async Operations

Use `waitFor` when waiting for async state to settle (e.g., API responses, query loading):

```typescript
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

### 4. Not Restoring Real Timers

If you use `vi.useFakeTimers()`, always restore them in `afterEach`:

```typescript
afterEach(() => {
  vi.useRealTimers();
});
```

---

## E2E Testing

For full browser-based E2E tests (Playwright), see the `apps/e2e/` package and the [Testing Strategy](./README.md#e2e-testing-playwright) guide. E2E tests complement the frontend unit tests documented here by testing the entire user flow through the real API and database.
