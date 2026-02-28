// ===========================================
// Admin Route Tests
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { AdminRoute } from './AdminRoute.js';

const makeUser = (overrides: Partial<{ isAdmin: boolean; permissions: string[] }> = {}) => ({
  id: '123',
  email: 'admin@example.com',
  isAdmin: false,
  preferences: { theme: 'system' as const },
  permissions: [] as string[],
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

function renderWithRouter(initialRoute: string = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      intendedDestination: null,
    });
  });

  it('should render children when user is admin', () => {
    useAuthStore.setState({
      user: makeUser({ isAdmin: true }),
      accessToken: 'token',
      isAuthenticated: true,
    });

    renderWithRouter();
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should render children when user has an admin permission', () => {
    useAuthStore.setState({
      user: makeUser({ permissions: ['users:read'] }),
      accessToken: 'token',
      isAuthenticated: true,
    });

    renderWithRouter();
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should redirect to / when user lacks admin permissions', () => {
    useAuthStore.setState({
      user: makeUser({ permissions: [] }),
      accessToken: 'token',
      isAuthenticated: true,
    });

    renderWithRouter();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('should redirect to /login when not authenticated', () => {
    renderWithRouter();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should show spinner while loading', () => {
    useAuthStore.setState({ isLoading: true });

    renderWithRouter();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
