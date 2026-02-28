// ===========================================
// Permission Hook Tests
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '../stores/auth.store.js';
import {
  usePermission,
  useAnyPermission,
  useAllPermissions,
  usePermissions,
  hasPermission,
  hasAnyPermission,
} from './usePermission.js';

const mockUser = {
  id: '123',
  email: 'test@example.com',
  isAdmin: false,
  preferences: { theme: 'system' as const },
  permissions: ['users:read', 'users:create', 'roles:read'],
  createdAt: '2024-01-01T00:00:00Z',
};

describe('Permission Hooks', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      intendedDestination: null,
    });
  });

  describe('hasPermission (imperative)', () => {
    it('should return true when user has the permission', () => {
      expect(hasPermission('users:read')).toBe(true);
    });

    it('should return false when user lacks the permission', () => {
      expect(hasPermission('users:delete')).toBe(false);
    });

    it('should return false when user is null', () => {
      useAuthStore.setState({ user: null });
      expect(hasPermission('users:read')).toBe(false);
    });
  });

  describe('hasAnyPermission (imperative)', () => {
    it('should return true when user has at least one permission', () => {
      expect(hasAnyPermission(['users:delete', 'roles:read'])).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      expect(hasAnyPermission(['users:delete', 'roles:delete'])).toBe(false);
    });

    it('should return false when user is null', () => {
      useAuthStore.setState({ user: null });
      expect(hasAnyPermission(['users:read'])).toBe(false);
    });
  });

  describe('usePermission hook', () => {
    it('should return true for a permission the user has', () => {
      const { result } = renderHook(() => usePermission('users:read'));
      expect(result.current).toBe(true);
    });

    it('should return false for a permission the user lacks', () => {
      const { result } = renderHook(() => usePermission('users:delete'));
      expect(result.current).toBe(false);
    });
  });

  describe('useAnyPermission hook', () => {
    it('should return true if user has any of the listed permissions', () => {
      const { result } = renderHook(() => useAnyPermission(['users:delete', 'users:read']));
      expect(result.current).toBe(true);
    });

    it('should return false if user has none of the listed permissions', () => {
      const { result } = renderHook(() => useAnyPermission(['users:delete', 'roles:delete']));
      expect(result.current).toBe(false);
    });
  });

  describe('useAllPermissions hook', () => {
    it('should return true if user has all listed permissions', () => {
      const { result } = renderHook(() => useAllPermissions(['users:read', 'roles:read']));
      expect(result.current).toBe(true);
    });

    it('should return false if user is missing any listed permission', () => {
      const { result } = renderHook(() => useAllPermissions(['users:read', 'users:delete']));
      expect(result.current).toBe(false);
    });
  });

  describe('usePermissions hook', () => {
    it('should return the full permissions array', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current).toEqual(['users:read', 'users:create', 'roles:read']);
    });

    it('should return empty array when user is null', () => {
      useAuthStore.setState({ user: null });
      const { result } = renderHook(() => usePermissions());
      expect(result.current).toEqual([]);
    });
  });
});
