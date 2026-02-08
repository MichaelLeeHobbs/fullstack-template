// ===========================================
// Users Table Schema
// ===========================================

import { pgTable, uuid, varchar, timestamp, boolean, jsonb, index, integer } from 'drizzle-orm/pg-core';

// ===========================================
// User Preferences Type
// ===========================================
// Stored as JSONB for extensibility

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  // Future: language, timezone, notifications, etc.
}

export const defaultPreferences: UserPreferences = {
  theme: 'system',
};

// ===========================================
// Account Types
// ===========================================

export const ACCOUNT_TYPES = {
  USER: 'user',
  SERVICE: 'service',
} as const;

export type AccountType = (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),

  // Account type & Status
  accountType: varchar('account_type', { length: 20 }).default('user').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),

  // Preferences (JSONB for extensibility)
  preferences: jsonb('preferences').$type<UserPreferences>().default(defaultPreferences).notNull(),

  // Lockout
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),

  // Timestamps
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('users_is_active_idx').on(table.isActive),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

