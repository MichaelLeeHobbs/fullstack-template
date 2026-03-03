// ===========================================
// SSO Identities Schema
// ===========================================
// Links SSO accounts (external IdP identities) to local users.

import { pgTable, uuid, varchar, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { ssoProviders } from './sso-providers.js';

export const ssoIdentities = pgTable('sso_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').notNull().references(() => ssoProviders.id, { onDelete: 'cascade' }),
  externalId: varchar('external_id', { length: 500 }).notNull(),
  email: varchar('email', { length: 255 }),
  profile: jsonb('profile').$type<Record<string, unknown>>(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sso_identities_user_id_idx').on(table.userId),
  index('sso_identities_provider_id_idx').on(table.providerId),
  uniqueIndex('sso_identities_user_provider_idx').on(table.userId, table.providerId),
  uniqueIndex('sso_identities_provider_external_idx').on(table.providerId, table.externalId),
]);

export type SsoIdentity = typeof ssoIdentities.$inferSelect;
export type NewSsoIdentity = typeof ssoIdentities.$inferInsert;
