// ===========================================
// Protected Route Tests
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { ProtectedRoute } from './ProtectedRoute.js';

const mockUser = {
  id: '123',
  email: 'test@example.com',
  isAdmin: false,
  preferences: { theme: 'system' as const },
  permissions: [] as string[],
  createdAt: '2024-01-01T00:00:00Z',
};

function renderWithRouter(initialRoute: string = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      intendedDestination: null,
    });
  });

  it('should render children when authenticated', () => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'token',
      isAuthenticated: true,
    });

    renderWithRouter();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to /login when not authenticated', () => {
    renderWithRouter();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should save current path as intendedDestination when redirecting', () => {
    renderWithRouter('/protected');
    expect(useAuthStore.getState().intendedDestination).toBe('/protected');
  });
});
