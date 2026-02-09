// ===========================================
// User Role Service
// ===========================================
// Handles user-role assignments.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { users, roles, userRoles, type Role } from '../db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { PermissionService } from './permission.service.js';

// ===========================================
// Types
// ===========================================

export interface UserWithRoles {
  id: string;
  email: string;
  roles: Role[];
}

// ===========================================
// User Role Service
// ===========================================

export class UserRoleService {
  /**
   * Get roles for a user
   */
  static async getUserRoles(userId: string): Promise<Result<Role[]>> {
    return tryCatch(async () => {
      const result = await db
        .select({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          isSystem: roles.isSystem,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      return result;
    });
  }

  /**
   * Check if user has a specific role
   */
  static async userHasRole(userId: string, roleName: string): Promise<Result<boolean>> {
    return tryCatch(async () => {
      const [result] = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, userId), eq(roles.name, roleName)));

      return !!result;
    });
  }

  /**
   * Assign a role to a user
   */
  static async assignRole(userId: string, roleId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      // Verify user exists
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      // Verify role exists
      const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId));

      if (!role) {
        throw new Error('Role not found');
      }

      // Check if already assigned
      const [existing] = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

      if (existing) {
        return; // Already assigned, no-op
      }

      await db.insert(userRoles).values({
        userId,
        roleId,
      });

      // Invalidate permission cache
      PermissionService.invalidateUserCache(userId);
    });
  }

  /**
   * Remove a role from a user
   */
  static async removeRole(userId: string, roleId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      await db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

      // Invalidate permission cache
      PermissionService.invalidateUserCache(userId);
    });
  }

  /**
   * Set all roles for a user (replaces existing)
   */
  static async setRoles(userId: string, roleIds: string[]): Promise<Result<void>> {
    return tryCatch(async () => {
      // Verify user exists
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      // Validate all role IDs exist
      if (roleIds.length > 0) {
        const validRoles = await db
          .select({ id: roles.id })
          .from(roles)
          .where(inArray(roles.id, roleIds));

        if (validRoles.length !== roleIds.length) {
          throw new Error('One or more role IDs are invalid');
        }
      }

      // Transaction: delete + insert roles atomically
      await db.transaction(async (tx) => {
        await tx.delete(userRoles).where(eq(userRoles.userId, userId));

        if (roleIds.length > 0) {
          await tx.insert(userRoles).values(
            roleIds.map((roleId) => ({
              userId,
              roleId,
            }))
          );
        }
      });

      // Cache invalidation after transaction commits
      PermissionService.invalidateUserCache(userId);
    });
  }

  /**
   * Get all users with their roles
   */
  static async getAllUsersWithRoles(): Promise<Result<UserWithRoles[]>> {
    return tryCatch(async () => {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .orderBy(users.email);

      if (allUsers.length === 0) return [];

      // Batch-fetch all user-role assignments in one query
      const userIds = allUsers.map((u) => u.id);
      const allUserRoles = await db
        .select({
          userId: userRoles.userId,
          id: roles.id,
          name: roles.name,
          description: roles.description,
          isSystem: roles.isSystem,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(inArray(userRoles.userId, userIds));

      // Group roles by userId
      const rolesByUser = new Map<string, Role[]>();
      for (const row of allUserRoles) {
        const list = rolesByUser.get(row.userId) ?? [];
        list.push({ id: row.id, name: row.name, description: row.description, isSystem: row.isSystem, createdAt: row.createdAt, updatedAt: row.updatedAt });
        rolesByUser.set(row.userId, list);
      }

      return allUsers.map((user) => ({
        ...user,
        roles: rolesByUser.get(user.id) ?? [],
      }));
    });
  }

  /**
   * Get users with a specific role
   */
  static async getUsersWithRole(roleId: string): Promise<Result<Array<{ id: string; email: string }>>> {
    return tryCatch(async () => {
      return db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(userRoles)
        .innerJoin(users, eq(userRoles.userId, users.id))
        .where(eq(userRoles.roleId, roleId));
    });
  }
}
