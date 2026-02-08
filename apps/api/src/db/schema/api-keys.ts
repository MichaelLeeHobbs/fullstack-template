// ===========================================
// API Keys Schema
// ===========================================
// API keys for programmatic access. Keys are SHA-256 hashed.

import { pgTable, uuid, varchar, timestamp, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { permissions } from './permissions.js';

// ===========================================
// API Keys Table
// ===========================================

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  prefix: varchar('prefix', { length: 8 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('api_keys_user_id_idx').on(table.userId),
  index('api_keys_key_hash_idx').on(table.keyHash),
]);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// ===========================================
// API Key Permissions Junction Table
// ===========================================

export const apiKeyPermissions = pgTable('api_key_permissions', {
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.apiKeyId, table.permissionId] }),
]);

export type ApiKeyPermission = typeof apiKeyPermissions.$inferSelect;
