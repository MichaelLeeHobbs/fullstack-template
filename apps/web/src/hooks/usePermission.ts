// ===========================================
// Permission Hooks
// ===========================================
// Hooks for checking user permissions.

import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth.store.js';

/**
 * Check if user has a specific permission
 */
export function usePermission(permission: string): boolean {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  }, [user?.permissions, permission]);
}

/**
 * Check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    if (!user?.permissions) return false;
    return permissions.some((p) => user.permissions.includes(p));
  }, [user?.permissions, permissions]);
}

/**
 * Check if user has all of the specified permissions
 */
export function useAllPermissions(permissions: string[]): boolean {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    if (!user?.permissions) return false;
    return permissions.every((p) => user.permissions.includes(p));
  }, [user?.permissions, permissions]);
}

/**
 * Get all user permissions
 */
export function usePermissions(): string[] {
  const user = useAuthStore((state) => state.user);
  return user?.permissions ?? [];
}

/**
 * Check permissions imperatively (for use outside components)
 */
export function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.permissions?.includes(permission) ?? false;
}

/**
 * Check any permission imperatively
 */
export function hasAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore.getState().user;
  if (!user?.permissions) return false;
  return permissions.some((p) => user.permissions.includes(p));
}
