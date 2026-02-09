// ===========================================
// Settings Service
// ===========================================
// Reads and writes runtime settings from database with caching.
// Feature flags, UI config, and other runtime settings.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { systemSettings, type SystemSetting } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger.js';

// ===========================================
// In-memory Cache
// ===========================================

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// ===========================================
// Settings Service
// ===========================================

export class SettingsService {
  /**
   * Get a setting value by key with caching
   */
  static async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const result = await tryCatch(async () => {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));

      if (!setting) {
        return defaultValue;
      }

      return this.parseValue(setting.value, setting.type);
    });

    if (!result.ok) {
      logger.error({
        key,
        error: result.error.toString(),
      }, 'Failed to get setting');
      return defaultValue as T;
    }

    // Update cache
    cache.set(key, {
      value: result.value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result.value as T;
  }

  /**
   * Set a setting value and invalidate cache
   */
  static async set(key: string, value: unknown): Promise<Result<void>> {
    return tryCatch(async () => {
      const stringValue = this.stringifyValue(value);

      const result = await db
        .update(systemSettings)
        .set({ value: stringValue, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning({ key: systemSettings.key });

      if (result.length === 0) {
        throw new Error(`Setting not found: ${key}`);
      }

      // Invalidate cache
      cache.delete(key);

      logger.info({ key }, 'Setting updated');
    });
  }

  /**
   * Get a single setting by key (returns full setting object)
   */
  static async getByKey(key: string): Promise<Result<SystemSetting>> {
    return tryCatch(async () => {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));

      if (!setting) throw new Error('Setting not found');
      return setting;
    });
  }

  /**
   * Get all settings (for admin UI)
   */
  static async getAll(): Promise<Result<SystemSetting[]>> {
    return tryCatch(async () => {
      return await db
        .select()
        .from(systemSettings)
        .orderBy(systemSettings.category, systemSettings.key);
    });
  }

  /**
   * Get settings by category
   */
  static async getByCategory(category: string): Promise<Result<SystemSetting[]>> {
    return tryCatch(async () => {
      return await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.category, category))
        .orderBy(systemSettings.key);
    });
  }

  /**
   * Clear the entire cache (useful after bulk updates)
   */
  static clearCache(): void {
    cache.clear();
    logger.debug('Settings cache cleared');
  }

  /**
   * Parse string value based on type
   */
  private static parseValue(value: string, type: string): unknown {
    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'number':
        return Number(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          logger.warn( { value }, 'Failed to parse JSON setting');
          return null;
        }
      default:
        return value;
    }
  }

  /**
   * Stringify value for storage
   */
  private static stringifyValue(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

