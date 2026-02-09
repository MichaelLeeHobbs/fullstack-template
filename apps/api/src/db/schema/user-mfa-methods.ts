// ===========================================
// User MFA Methods Schema
// ===========================================
// Generic multi-factor authentication table.
// Extensible for future methods (secret key, PKI, WebAuthn).

import { pgTable, uuid, varchar, jsonb, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// ===========================================
// MFA Method Types
// ===========================================

export const MFA_METHODS = {
  TOTP: 'totp',
  // Future: SECRET_KEY: 'secret_key', PKI: 'pki', WEBAUTHN: 'webauthn'
} as const;

export type MfaMethod = (typeof MFA_METHODS)[keyof typeof MFA_METHODS];

// ===========================================
// MFA Config Types
// ===========================================
// Union grows as new methods are added.

export interface TotpConfig {
  secret: string;        // Base32-encoded TOTP secret
  backupCodes: string[]; // bcrypt-hashed backup codes
}

// To add a new method:
// 1. Add to MFA_METHODS const
// 2. Define its config interface (e.g., SecretKeyConfig)
// 3. Add to MfaMethodConfig union
// 4. Add case in MfaService.verify() dispatcher
export type MfaMethodConfig = TotpConfig;

// ===========================================
// User MFA Methods Table
// ===========================================

export const userMfaMethods = pgTable('user_mfa_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  method: varchar('method', { length: 50 }).notNull(),
  config: jsonb('config').$type<MfaMethodConfig>().notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_mfa_methods_user_id_idx').on(table.userId),
  unique('user_mfa_methods_user_method_unique').on(table.userId, table.method),
]);

export type UserMfaMethod = typeof userMfaMethods.$inferSelect;
export type NewUserMfaMethod = typeof userMfaMethods.$inferInsert;
