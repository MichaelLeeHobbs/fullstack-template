// ===========================================
// Service Account Service
// ===========================================
// Manages service accounts — headless users for API key access.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import { users, ACCOUNT_TYPES } from '../db/schema/index.js';
import { eq, and, count, inArray, sql } from 'drizzle-orm';
import { apiKeys } from '../db/schema/api-keys.js';
import { type PaginatedResult, paginationToOffset, buildPaginationResult } from '../lib/pagination.js';

export interface ServiceAccount {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  apiKeyCount: number;
}

export class ServiceAccountService {
  /**
   * Create a service account
   */
  static async create(email: string): Promise<Result<ServiceAccount>> {
    return tryCatch(async () => {
      // Check for existing email
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));
      if (existing) throw new ServiceError('ALREADY_EXISTS', 'Email already exists');

      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash: null,
          accountType: ACCOUNT_TYPES.SERVICE,
          emailVerified: true,
          isActive: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          isActive: users.isActive,
          createdAt: users.createdAt,
        });

      if (!user) throw new Error('Failed to create service account');

      return { ...user, apiKeyCount: 0 };
    });
  }

  /**
   * List service accounts with pagination
   */
  static async list(page = 1, limit = 20): Promise<Result<PaginatedResult<ServiceAccount>>> {
    return tryCatch(async () => {
      const { offset } = paginationToOffset(page, limit);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.accountType, ACCOUNT_TYPES.SERVICE));
      const total = Number(countResult?.count || 0);

      const accounts = await db
        .select({
          id: users.id,
          email: users.email,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.accountType, ACCOUNT_TYPES.SERVICE))
        .orderBy(users.createdAt)
        .limit(limit)
        .offset(offset);

      if (accounts.length === 0) return buildPaginationResult([], total, page, limit);

      // Batch-fetch API key counts in one query
      const accountIds = accounts.map((a) => a.id);
      const keyCounts = await db
        .select({
          userId: apiKeys.userId,
          count: count(),
        })
        .from(apiKeys)
        .where(inArray(apiKeys.userId, accountIds))
        .groupBy(apiKeys.userId);

      const countByUser = new Map(keyCounts.map((r) => [r.userId, r.count]));

      const accountsWithKeys = accounts.map((account) => ({
        ...account,
        apiKeyCount: countByUser.get(account.id) ?? 0,
      }));

      return buildPaginationResult(accountsWithKeys, total, page, limit);
    });
  }

  /**
   * Delete a service account (cascades to API keys)
   */
  static async delete(id: string): Promise<Result<{ deleted: boolean }>> {
    return tryCatch(async () => {
      // Verify it's a service account
      const [user] = await db
        .select({ id: users.id, accountType: users.accountType })
        .from(users)
        .where(and(eq(users.id, id), eq(users.accountType, ACCOUNT_TYPES.SERVICE)));

      if (!user) throw new ServiceError('NOT_FOUND', 'Service account not found');

      await db.delete(users).where(eq(users.id, id));

      return { deleted: true };
    });
  }
}
