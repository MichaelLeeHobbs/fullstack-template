// ===========================================
// Permission Service
// ===========================================
// Handles permission checks with in-memory caching.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import {
  permissions,
  roles,
  rolePermissions,
  userRoles,
  type Permission,
} from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger.js';

// ===========================================
// Permission Cache
// ===========================================
// Caches user permissions to avoid repeated DB queries.

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ===========================================
// Permission Service
// ===========================================

export class PermissionService {
  /**
   * Get all permissions from database
   */
  static async getAll(): Promise<Result<Permission[]>> {
    return tryCatch(async () => {
      return db.select().from(permissions).orderBy(permissions.resource, permissions.action);
    });
  }

  /**
   * Get permissions grouped by resource for UI display
   */
  static async getAllGrouped(): Promise<Result<Record<string, Permission[]>>> {
    return tryCatch(async () => {
      const allPermissions = await db
        .select()
        .from(permissions)
        .orderBy(permissions.resource, permissions.action);

      const grouped: Record<string, Permission[]> = {};
      for (const permission of allPermissions) {
        const resource = permission.resource;
        if (!grouped[resource]) {
          grouped[resource] = [];
        }
        grouped[resource]!.push(permission);
      }
      return grouped;
    });
  }

  /**
   * Get user's permissions from cache or database
   */
  static async getUserPermissions(userId: string): Promise<Set<string>> {
    // Check cache first
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    // Fetch from database
    const permissions = await this.fetchUserPermissions(userId);

    // Cache the result
    permissionCache.set(userId, {
      permissions,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return permissions;
  }

  /**
   * Fetch user permissions from database (bypasses cache)
   */
  private static async fetchUserPermissions(userId: string): Promise<Set<string>> {
    // Get all permissions for user's roles
    const result = await db
      .selectDistinct({ permissionName: permissions.name })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    return new Set(result.map((r) => r.permissionName));
  }

  /**
   * Check if user has a specific permission
   */
  static async userHasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.has(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async userHasAnyPermission(userId: string, permissionList: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissionList.some((p) => permissions.has(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async userHasAllPermissions(userId: string, permissionList: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissionList.every((p) => permissions.has(p));
  }

  /**
   * Get user's roles with their permissions
   */
  static async getUserRolesWithPermissions(
    userId: string
  ): Promise<Result<Array<{ role: string; permissions: string[] }>>> {
    return tryCatch(async () => {
      const userRoleData = await db
        .select({
          roleName: roles.name,
          permissionName: permissions.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(userRoles.userId, userId));

      // Group by role
      const roleMap = new Map<string, Set<string>>();
      for (const row of userRoleData) {
        if (!roleMap.has(row.roleName)) {
          roleMap.set(row.roleName, new Set());
        }
        if (row.permissionName) {
          roleMap.get(row.roleName)!.add(row.permissionName);
        }
      }

      return Array.from(roleMap.entries()).map(([role, perms]) => ({
        role,
        permissions: Array.from(perms),
      }));
    });
  }

  // ===========================================
  // Cache Management
  // ===========================================

  /**
   * Invalidate a specific user's permission cache
   */
  static invalidateUserCache(userId: string): void {
    permissionCache.delete(userId);
    logger.debug({ userId }, 'Permission cache invalidated for user');
  }

  /**
   * Invalidate cache for multiple users
   */
  static invalidateUsersCache(userIds: string[]): void {
    for (const userId of userIds) {
      permissionCache.delete(userId);
    }
    logger.debug({ count: userIds.length }, 'Permission cache invalidated for users');
  }

  /**
   * Invalidate all cached permissions
   */
  static invalidateAllCache(): void {
    permissionCache.clear();
    logger.debug('All permission caches invalidated');
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): { size: number; entries: Array<{ userId: string; expiresIn: number }> } {
    const now = Date.now();
    const entries = Array.from(permissionCache.entries()).map(([userId, entry]) => ({
      userId,
      expiresIn: Math.max(0, entry.expiresAt - now),
    }));

    return {
      size: permissionCache.size,
      entries,
    };
  }
}
