// ===========================================
// Users Table Schema
// ===========================================

import { pgTable, uuid, varchar, timestamp, boolean, jsonb, index, integer } from 'drizzle-orm/pg-core';
import type { UserPreferences } from '@fullstack-template/shared';

export type { UserPreferences };

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
  lockedUntil: timestamp('locked_until', { withTimezone: true }),

  // Timestamps
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('users_is_active_idx').on(table.isActive),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

