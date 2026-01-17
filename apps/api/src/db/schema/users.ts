// ===========================================
// Users Table Schema
// ===========================================

import { pgTable, uuid, varchar, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),

  // Role & Status
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),

  // Preferences (JSONB for extensibility)
  preferences: jsonb('preferences').$type<UserPreferences>().default(defaultPreferences).notNull(),

  // Timestamps
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

