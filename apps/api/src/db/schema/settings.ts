// ===========================================
// System Settings Schema
// ===========================================
// Runtime-configurable application settings stored in database.
// Feature flags, UI config, and other runtime settings.
// Secrets (API keys, etc.) stay in environment variables.

import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Setting value types for parsing
export const settingTypeEnum = pgEnum('setting_type', [
  'string',
  'number',
  'boolean',
  'json',
]);

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Unique key using dot notation: 'feature.ai_enabled', 'email.from_name'
  key: varchar('key', { length: 255 }).notNull().unique(),

  // Value stored as string, parsed based on type
  value: text('value').notNull(),

  // Type for parsing the value
  type: settingTypeEnum('type').notNull().default('string'),

  // Human-readable description for admin UI
  description: text('description'),

  // Category for grouping: 'features', 'email', 'ai', 'general'
  category: varchar('category', { length: 100 }).default('general'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

