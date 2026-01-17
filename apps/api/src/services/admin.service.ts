// ===========================================
// Admin Service
// ===========================================
// Handles admin operations for user management.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { users, auditLogs } from '../db/schema/index.js';
import { eq, like, and, desc, sql, type SQL } from 'drizzle-orm';

// ===========================================
// Types
// ===========================================

interface ListUsersOptions {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserListItem {
  id: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface UserDetails extends UserListItem {
  updatedAt: Date;
}

// ===========================================
// Admin Service
// ===========================================

export class AdminService {
  /**
   * List users with pagination and filtering
   */
  static async listUsers(options: ListUsersOptions): Promise<Result<PaginatedResult<UserListItem>>> {
    return tryCatch(async () => {
      const { page, limit, search, isActive, isAdmin } = options;
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions: SQL[] = [];
      if (search) {
        conditions.push(like(users.email, `%${search}%`));
      }
      if (isActive !== undefined) {
        conditions.push(eq(users.isActive, isActive));
      }
      if (isAdmin !== undefined) {
        conditions.push(eq(users.isAdmin, isAdmin));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      // Get users
      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          isAdmin: users.isAdmin,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: userList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  /**
   * Get single user details
   */
  static async getUser(userId: string): Promise<Result<UserDetails>> {
    return tryCatch(async () => {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          isAdmin: users.isAdmin,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    });
  }

  /**
   * Update user admin/active status
   */
  static async updateUser(
    userId: string,
    updates: { isActive?: boolean; isAdmin?: boolean }
  ): Promise<Result<UserListItem>> {
    return tryCatch(async () => {
      const [user] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          isAdmin: users.isAdmin,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    });
  }

  /**
   * Delete user (cannot delete self)
   */
  static async deleteUser(userId: string, adminId: string): Promise<Result<{ message: string }>> {
    return tryCatch(async () => {
      if (userId === adminId) {
        throw new Error('Cannot delete your own account');
      }

      const result = await db.delete(users).where(eq(users.id, userId));

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      return { message: 'User deleted successfully' };
    });
  }

  /**
   * List audit logs with pagination
   */
  static async listAuditLogs(
    page: number,
    limit: number,
    userId?: string
  ): Promise<Result<PaginatedResult<unknown>>> {
    return tryCatch(async () => {
      const offset = (page - 1) * limit;

      const whereClause = userId ? eq(auditLogs.userId, userId) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      // Get logs with actor email via left join
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          action: auditLogs.action,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          details: auditLogs.details,
          success: auditLogs.success,
          createdAt: auditLogs.createdAt,
          actorEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }
}
