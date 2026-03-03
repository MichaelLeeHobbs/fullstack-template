// ===========================================
// SSO Providers Schema
// ===========================================
// Stores SSO provider configurations (OIDC and SAML).
// Secrets (e.g., clientSecret) are encrypted at rest via crypto.ts.

import { pgTable, uuid, varchar, timestamp, boolean, jsonb, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { roles } from './roles.js';
import type { OidcProviderConfig, SamlProviderConfig } from '@fullstack-template/shared';

export const ssoProviders = pgTable('sso_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  protocol: varchar('protocol', { length: 10 }).notNull(),
  config: jsonb('config').$type<OidcProviderConfig | SamlProviderConfig>().notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  allowedDomains: jsonb('allowed_domains').$type<string[]>().default([]).notNull(),
  autoCreateUsers: boolean('auto_create_users').default(true).notNull(),
  defaultRoleId: uuid('default_role_id').references(() => roles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sso_providers_is_enabled_idx').on(table.isEnabled),
  check('sso_providers_protocol_check', sql`${table.protocol} IN ('oidc', 'saml')`),
]);

export type SsoProvider = typeof ssoProviders.$inferSelect;
export type NewSsoProvider = typeof ssoProviders.$inferInsert;
