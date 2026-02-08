// ===========================================
// Role Service
// ===========================================
// Handles role CRUD and permission assignment.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import {
  roles,
  rolePermissions,
  permissions,
  userRoles,
  type Role,
  type NewRole,
} from '../db/schema/index.js';
import { eq, inArray } from 'drizzle-orm';
import { PermissionService } from './permission.service.js';

// ===========================================
// Types
// ===========================================

export interface RoleWithPermissions extends Role {
  permissions: Array<{
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
  }>;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}

// ===========================================
// Role Service
// ===========================================

export class RoleService {
  /**
   * Get all roles
   */
  static async getAll(): Promise<Result<Role[]>> {
    return tryCatch(async () => {
      return db.select().from(roles).orderBy(roles.name);
    });
  }

  /**
   * Get all roles with their permissions
   */
  static async getAllWithPermissions(): Promise<Result<RoleWithPermissions[]>> {
    return tryCatch(async () => {
      const allRoles = await db.select().from(roles).orderBy(roles.name);

      const rolesWithPermissions: RoleWithPermissions[] = [];

      for (const role of allRoles) {
        const rolePerms = await db
          .select({
            id: permissions.id,
            name: permissions.name,
            description: permissions.description,
            resource: permissions.resource,
            action: permissions.action,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(rolePermissions.roleId, role.id));

        rolesWithPermissions.push({
          ...role,
          permissions: rolePerms,
        });
      }

      return rolesWithPermissions;
    });
  }

  /**
   * Get role by ID with permissions
   */
  static async getById(id: string): Promise<Result<RoleWithPermissions>> {
    return tryCatch(async () => {
      const [role] = await db.select().from(roles).where(eq(roles.id, id));

      if (!role) {
        throw new Error('Role not found');
      }

      const rolePerms = await db
        .select({
          id: permissions.id,
          name: permissions.name,
          description: permissions.description,
          resource: permissions.resource,
          action: permissions.action,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, id));

      return {
        ...role,
        permissions: rolePerms,
      };
    });
  }

  /**
   * Get role by name
   */
  static async getByName(name: string): Promise<Result<Role | null>> {
    return tryCatch(async () => {
      const [role] = await db.select().from(roles).where(eq(roles.name, name));
      return role || null;
    });
  }

  /**
   * Create a new role
   */
  static async create(data: CreateRoleData): Promise<Result<RoleWithPermissions>> {
    return tryCatch(async () => {
      // Check if role name already exists
      const [existing] = await db.select().from(roles).where(eq(roles.name, data.name));
      if (existing) {
        throw new Error('Role with this name already exists');
      }

      // Transaction: insert role + permissions atomically
      const role = await db.transaction(async (tx) => {
        const [role] = await tx
          .insert(roles)
          .values({
            name: data.name,
            description: data.description,
            isSystem: false,
          })
          .returning();

        if (!role) {
          throw new Error('Failed to create role');
        }

        if (data.permissionIds && data.permissionIds.length > 0) {
          await tx.insert(rolePermissions).values(
            data.permissionIds.map((permissionId) => ({
              roleId: role.id,
              permissionId,
            }))
          );
        }

        return role;
      });

      // Return role with permissions (read-only, outside transaction)
      const result = await this.getById(role.id);
      if (!result.ok) {
        throw result.error;
      }
      return result.value;
    });
  }

  /**
   * Update an existing role
   */
  static async update(id: string, data: UpdateRoleData): Promise<Result<Role>> {
    return tryCatch(async () => {
      const [existing] = await db.select().from(roles).where(eq(roles.id, id));

      if (!existing) {
        throw new Error('Role not found');
      }

      if (existing.isSystem) {
        throw new Error('Cannot modify system role');
      }

      // Check name uniqueness if changing name
      if (data.name && data.name !== existing.name) {
        const [nameExists] = await db.select().from(roles).where(eq(roles.name, data.name));
        if (nameExists) {
          throw new Error('Role with this name already exists');
        }
      }

      const [updated] = await db
        .update(roles)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update role');
      }

      return updated;
    });
  }

  /**
   * Delete a role
   */
  static async delete(id: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const [existing] = await db.select().from(roles).where(eq(roles.id, id));

      if (!existing) {
        throw new Error('Role not found');
      }

      if (existing.isSystem) {
        throw new Error('Cannot delete system role');
      }

      // Get all users with this role for cache invalidation
      const affectedUsers = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, id));

      // Delete role (cascade will remove role_permissions and user_roles)
      await db.delete(roles).where(eq(roles.id, id));

      // Invalidate cache for affected users
      PermissionService.invalidateUsersCache(affectedUsers.map((u) => u.userId));
    });
  }

  /**
   * Set permissions for a role (replaces existing)
   */
  static async setPermissions(roleId: string, permissionIds: string[]): Promise<Result<void>> {
    return tryCatch(async () => {
      const [role] = await db.select().from(roles).where(eq(roles.id, roleId));

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystem) {
        throw new Error('Cannot modify permissions for system role');
      }

      // Validate all permission IDs exist
      if (permissionIds.length > 0) {
        const validPermissions = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.id, permissionIds));

        if (validPermissions.length !== permissionIds.length) {
          throw new Error('One or more permission IDs are invalid');
        }
      }

      // Get affected users before transaction (for cache invalidation after)
      const affectedUsers = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, roleId));

      // Transaction: delete + insert permissions atomically
      await db.transaction(async (tx) => {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

        if (permissionIds.length > 0) {
          await tx.insert(rolePermissions).values(
            permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            }))
          );
        }
      });

      // Cache invalidation after transaction commits
      PermissionService.invalidateUsersCache(affectedUsers.map((u) => u.userId));
    });
  }

  /**
   * Add permissions to a role
   */
  static async addPermissions(roleId: string, permissionIds: string[]): Promise<Result<void>> {
    return tryCatch(async () => {
      const [role] = await db.select().from(roles).where(eq(roles.id, roleId));

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystem) {
        throw new Error('Cannot modify permissions for system role');
      }

      // Get existing permissions
      const existing = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      const existingIds = new Set(existing.map((e) => e.permissionId));
      const newIds = permissionIds.filter((id) => !existingIds.has(id));

      if (newIds.length > 0) {
        await db.insert(rolePermissions).values(
          newIds.map((permissionId) => ({
            roleId,
            permissionId,
          }))
        );

        // Get affected users for cache invalidation
        const affectedUsers = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(eq(userRoles.roleId, roleId));

        PermissionService.invalidateUsersCache(affectedUsers.map((u) => u.userId));
      }
    });
  }

  /**
   * Remove permissions from a role
   */
  static async removePermissions(roleId: string, permissionIds: string[]): Promise<Result<void>> {
    return tryCatch(async () => {
      const [role] = await db.select().from(roles).where(eq(roles.id, roleId));

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystem) {
        throw new Error('Cannot modify permissions for system role');
      }

      await db
        .delete(rolePermissions)
        .where(
          eq(rolePermissions.roleId, roleId) &&
            inArray(rolePermissions.permissionId, permissionIds)
        );

      // Get affected users for cache invalidation
      const affectedUsers = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, roleId));

      PermissionService.invalidateUsersCache(affectedUsers.map((u) => u.userId));
    });
  }
}
