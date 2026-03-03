// ===========================================
// SSO Auth Codes Schema
// ===========================================
// Short-lived codes for secure token delivery after SSO callback.
// 60-second TTL, single-use.

import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const ssoAuthCodes = pgTable('sso_auth_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sso_auth_codes_user_id_idx').on(table.userId),
  index('sso_auth_codes_expires_at_idx').on(table.expiresAt),
]);

export type SsoAuthCode = typeof ssoAuthCodes.$inferSelect;
export type NewSsoAuthCode = typeof ssoAuthCodes.$inferInsert;
