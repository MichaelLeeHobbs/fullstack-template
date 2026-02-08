// ===========================================
// Auth Store Tests
// ===========================================

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
    // Reset store before each test
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

  describe('setAccessToken', () => {
    it('should update access token', () => {
      useAuthStore.getState().setAccessToken('new-access-token');
      expect(useAuthStore.getState().accessToken).toBe('new-access-token');
    });
  });

  describe('setIntendedDestination', () => {
    it('should set intended destination', () => {
      useAuthStore.getState().setIntendedDestination('/profile');
      expect(useAuthStore.getState().intendedDestination).toBe('/profile');
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

  describe('clearAuth', () => {
    it('should clear all auth state', () => {
      // First set some auth
      useAuthStore.getState().setAuth(mockUser, 'access-token');

      // Then clear
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
