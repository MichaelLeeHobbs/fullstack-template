// ===========================================
// Service Account Service
// ===========================================
// Manages service accounts — headless users for API key access.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { users, ACCOUNT_TYPES } from '../db/schema/index.js';
import { eq, and, count } from 'drizzle-orm';
import { apiKeys } from '../db/schema/api-keys.js';

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
      if (existing) throw new Error('Email already exists');

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
   * List all service accounts
   */
  static async list(): Promise<Result<ServiceAccount[]>> {
    return tryCatch(async () => {
      const accounts = await db
        .select({
          id: users.id,
          email: users.email,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.accountType, ACCOUNT_TYPES.SERVICE))
        .orderBy(users.createdAt);

      const result: ServiceAccount[] = [];
      for (const account of accounts) {
        const [keyCount] = await db
          .select({ count: count() })
          .from(apiKeys)
          .where(eq(apiKeys.userId, account.id));
        result.push({
          ...account,
          apiKeyCount: keyCount?.count ?? 0,
        });
      }

      return result;
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

      if (!user) throw new Error('Service account not found');

      await db.delete(users).where(eq(users.id, id));

      return { deleted: true };
    });
  }
}
