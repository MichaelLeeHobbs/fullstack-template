// ===========================================
// API Key Service
// ===========================================
// Manages API key lifecycle: creation, validation, revocation, deletion.
// Keys are SHA-256 hashed (not bcrypt — 256-bit random keys, fast lookup needed).

import { randomBytes, createHash } from 'crypto';
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { apiKeys, apiKeyPermissions, users, permissions } from '../db/schema/index.js';
import { eq, and, inArray, count, type SQL } from 'drizzle-orm';
import { PermissionService } from './permission.service.js';
import { paginationToOffset, buildPaginationResult, type PaginatedResult } from '../lib/pagination.js';

const KEY_PREFIX = 'fst_';

export interface ApiKeyWithPermissions {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  expiresAt: Date | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{ id: string; name: string }>;
  hasOrphanedPermissions?: boolean;
}

export interface ApiKeyListItem {
  id: string;
  userId: string;
  ownerEmail: string;
  name: string;
  prefix: string;
  expiresAt: Date | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  permissionCount: number;
}

export interface CreateApiKeyInput {
  name: string;
  permissionIds: string[];
  expiresAt?: Date | null;
  userId?: string;
}

export interface ValidatedKey {
  apiKey: { id: string; userId: string; name: string };
  userId: string;
  permissions: Set<string>;
}

export class ApiKeyService {
  /**
   * Hash a raw key using SHA-256
   */
  static hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Generate a new API key with prefix and hash
   */
  private static generateKey(): { rawKey: string; prefix: string; keyHash: string } {
    const bytes = randomBytes(32);
    const hex = bytes.toString('hex');
    const rawKey = `${KEY_PREFIX}${hex}`;
    const prefix = rawKey.substring(0, 8);
    const keyHash = this.hashKey(rawKey);
    return { rawKey, prefix, keyHash };
  }

  /**
   * Create a new API key
   */
  static async create(
    data: CreateApiKeyInput,
    creatorId: string,
    creatorIsAdmin: boolean
  ): Promise<Result<{ apiKey: ApiKeyWithPermissions; rawKey: string }>> {
    return tryCatch(async () => {
      const userId = data.userId || creatorId;

      // Validate permission subset for non-admin creators
      if (!creatorIsAdmin && data.permissionIds.length > 0) {
        const creatorPerms = await PermissionService.getUserPermissions(creatorId);
        // Look up permission names for the requested IDs
        const requestedPerms = await db
          .select({ id: permissions.id, name: permissions.name })
          .from(permissions)
          .where(inArray(permissions.id, data.permissionIds));

        for (const perm of requestedPerms) {
          if (!creatorPerms.has(perm.name)) {
            throw new Error(`Cannot assign permission '${perm.name}' — you do not have it`);
          }
        }
      }

      // Validate requested permission IDs exist
      if (data.permissionIds.length > 0) {
        const validPerms = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.id, data.permissionIds));
        if (validPerms.length !== data.permissionIds.length) {
          throw new Error('One or more invalid permission IDs');
        }
      }

      const { rawKey, prefix, keyHash } = this.generateKey();

      const apiKey = await db.transaction(async (tx) => {
        const [key] = await tx
          .insert(apiKeys)
          .values({
            userId,
            name: data.name,
            prefix,
            keyHash,
            expiresAt: data.expiresAt ?? null,
          })
          .returning();

        if (!key) throw new Error('Failed to create API key');

        if (data.permissionIds.length > 0) {
          await tx.insert(apiKeyPermissions).values(
            data.permissionIds.map((permissionId) => ({
              apiKeyId: key.id,
              permissionId,
            }))
          );
        }

        return key;
      });

      // Fetch with permissions
      const keyPerms = await this.getKeyPermissions(apiKey.id);

      return {
        apiKey: {
          id: apiKey.id,
          userId: apiKey.userId,
          name: apiKey.name,
          prefix: apiKey.prefix,
          expiresAt: apiKey.expiresAt,
          isActive: apiKey.isActive,
          lastUsedAt: apiKey.lastUsedAt,
          createdAt: apiKey.createdAt,
          updatedAt: apiKey.updatedAt,
          permissions: keyPerms,
        },
        rawKey,
      };
    });
  }

  /**
   * Validate an API key for authentication
   */
  static async validateKey(rawKey: string): Promise<Result<ValidatedKey>> {
    return tryCatch(async () => {
      const keyHash = this.hashKey(rawKey);

      const [key] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash));

      if (!key) throw new Error('Invalid API key');
      if (!key.isActive) throw new Error('API key has been revoked');
      if (key.expiresAt && key.expiresAt < new Date()) throw new Error('API key has expired');

      // Load key's permissions
      const keyPerms = await db
        .select({ name: permissions.name })
        .from(apiKeyPermissions)
        .innerJoin(permissions, eq(apiKeyPermissions.permissionId, permissions.id))
        .where(eq(apiKeyPermissions.apiKeyId, key.id));

      // Fire-and-forget lastUsedAt update
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .then(() => {})
        .catch(() => {});

      return {
        apiKey: { id: key.id, userId: key.userId, name: key.name },
        userId: key.userId,
        permissions: new Set(keyPerms.map((p) => p.name)),
      };
    });
  }

  /**
   * Get API key by ID with permissions and orphaned check
   */
  static async getById(id: string): Promise<Result<ApiKeyWithPermissions>> {
    return tryCatch(async () => {
      const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
      if (!key) throw new Error('API key not found');

      const keyPerms = await this.getKeyPermissions(key.id);

      // Check for orphaned permissions
      const ownerPerms = await PermissionService.getUserPermissions(key.userId);
      const hasOrphanedPermissions = keyPerms.some((p) => !ownerPerms.has(p.name));

      return {
        id: key.id,
        userId: key.userId,
        name: key.name,
        prefix: key.prefix,
        expiresAt: key.expiresAt,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        permissions: keyPerms,
        hasOrphanedPermissions,
      };
    });
  }

  /**
   * List API keys for a specific user
   */
  static async listByUser(userId: string): Promise<Result<ApiKeyWithPermissions[]>> {
    return tryCatch(async () => {
      const keys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId))
        .orderBy(apiKeys.createdAt);

      if (keys.length === 0) return [];

      // Batch-fetch all permissions for all keys in one query
      const keyIds = keys.map((k) => k.id);
      const allPerms = await db
        .select({
          apiKeyId: apiKeyPermissions.apiKeyId,
          id: permissions.id,
          name: permissions.name,
        })
        .from(apiKeyPermissions)
        .innerJoin(permissions, eq(apiKeyPermissions.permissionId, permissions.id))
        .where(inArray(apiKeyPermissions.apiKeyId, keyIds));

      const permsByKey = new Map<string, Array<{ id: string; name: string }>>();
      for (const perm of allPerms) {
        const list = permsByKey.get(perm.apiKeyId) ?? [];
        list.push({ id: perm.id, name: perm.name });
        permsByKey.set(perm.apiKeyId, list);
      }

      return keys.map((key) => ({
        id: key.id,
        userId: key.userId,
        name: key.name,
        prefix: key.prefix,
        expiresAt: key.expiresAt,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        permissions: permsByKey.get(key.id) ?? [],
      }));
    });
  }

  /**
   * List all API keys with pagination (admin)
   */
  static async listAll(params: {
    page: number;
    limit: number;
    userId?: string;
    isActive?: boolean;
  }): Promise<Result<PaginatedResult<ApiKeyListItem>>> {
    return tryCatch(async () => {
      const { page, limit, userId, isActive } = params;
      const { offset } = paginationToOffset(page, limit);

      const conditions: SQL[] = [];
      if (userId) conditions.push(eq(apiKeys.userId, userId));
      if (isActive !== undefined) conditions.push(eq(apiKeys.isActive, isActive));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: count() })
        .from(apiKeys)
        .where(whereClause);
      const total = totalResult?.count ?? 0;

      const rows = await db
        .select({
          id: apiKeys.id,
          userId: apiKeys.userId,
          ownerEmail: users.email,
          name: apiKeys.name,
          prefix: apiKeys.prefix,
          expiresAt: apiKeys.expiresAt,
          isActive: apiKeys.isActive,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .where(whereClause)
        .orderBy(apiKeys.createdAt)
        .limit(limit)
        .offset(offset);

      if (rows.length === 0) return buildPaginationResult([], total, page, limit);

      // Batch-fetch permission counts for all keys in one query
      const keyIds = rows.map((r) => r.id);
      const permCounts = await db
        .select({
          apiKeyId: apiKeyPermissions.apiKeyId,
          count: count(),
        })
        .from(apiKeyPermissions)
        .where(inArray(apiKeyPermissions.apiKeyId, keyIds))
        .groupBy(apiKeyPermissions.apiKeyId);

      const countByKey = new Map(permCounts.map((r) => [r.apiKeyId, r.count]));

      const items: ApiKeyListItem[] = rows.map((row) => ({
        ...row,
        permissionCount: countByKey.get(row.id) ?? 0,
      }));

      return buildPaginationResult(items, total, page, limit);
    });
  }

  /**
   * Revoke an API key
   */
  static async revoke(id: string): Promise<Result<{ id: string }>> {
    return tryCatch(async () => {
      const [key] = await db
        .update(apiKeys)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(apiKeys.id, id))
        .returning({ id: apiKeys.id });

      if (!key) throw new Error('API key not found');
      return key;
    });
  }

  /**
   * Delete an API key
   */
  static async delete(id: string): Promise<Result<{ deleted: boolean }>> {
    return tryCatch(async () => {
      const [key] = await db
        .delete(apiKeys)
        .where(eq(apiKeys.id, id))
        .returning({ id: apiKeys.id });

      if (!key) throw new Error('API key not found');
      return { deleted: true };
    });
  }

  /**
   * Set permissions for an API key
   */
  static async setPermissions(
    apiKeyId: string,
    permissionIds: string[],
    updaterId: string,
    updaterIsAdmin: boolean
  ): Promise<Result<{ id: string }>> {
    return tryCatch(async () => {
      // Verify key exists
      const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, apiKeyId));
      if (!key) throw new Error('API key not found');

      // Validate permission subset for non-admin
      if (!updaterIsAdmin && permissionIds.length > 0) {
        const updaterPerms = await PermissionService.getUserPermissions(updaterId);
        const requestedPerms = await db
          .select({ id: permissions.id, name: permissions.name })
          .from(permissions)
          .where(inArray(permissions.id, permissionIds));

        for (const perm of requestedPerms) {
          if (!updaterPerms.has(perm.name)) {
            throw new Error(`Cannot assign permission '${perm.name}' — you do not have it`);
          }
        }
      }

      // Validate IDs exist
      if (permissionIds.length > 0) {
        const validPerms = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.id, permissionIds));
        if (validPerms.length !== permissionIds.length) {
          throw new Error('One or more invalid permission IDs');
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(apiKeyPermissions).where(eq(apiKeyPermissions.apiKeyId, apiKeyId));
        if (permissionIds.length > 0) {
          await tx.insert(apiKeyPermissions).values(
            permissionIds.map((permissionId) => ({
              apiKeyId,
              permissionId,
            }))
          );
        }
        await tx
          .update(apiKeys)
          .set({ updatedAt: new Date() })
          .where(eq(apiKeys.id, apiKeyId));
      });

      return { id: apiKeyId };
    });
  }

  /**
   * Get permissions for a key
   */
  private static async getKeyPermissions(apiKeyId: string): Promise<Array<{ id: string; name: string }>> {
    return db
      .select({ id: permissions.id, name: permissions.name })
      .from(apiKeyPermissions)
      .innerJoin(permissions, eq(apiKeyPermissions.permissionId, permissions.id))
      .where(eq(apiKeyPermissions.apiKeyId, apiKeyId));
  }
}
