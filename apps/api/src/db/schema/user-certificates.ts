// ===========================================
// User Certificates Table Schema
// ===========================================
// Maps user accounts to their client certificates.

import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { certificates } from './certificates.js';

// ===========================================
// User Certificate Statuses
// ===========================================

export const USER_CERT_STATUSES = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export type UserCertStatus = (typeof USER_CERT_STATUSES)[keyof typeof USER_CERT_STATUSES];

// ===========================================
// User Certificates Table
// ===========================================

export const userCertificates = pgTable('user_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  certificateDn: varchar('certificate_dn', { length: 500 }).notNull(),
  certificateCn: varchar('certificate_cn', { length: 255 }).notNull(),
  certificateSerial: varchar('certificate_serial', { length: 128 }).notNull(),
  certificateFingerprint: varchar('certificate_fingerprint', { length: 128 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  certificateId: uuid('certificate_id').references(() => certificates.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  label: varchar('label', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_certificates_user_id_idx').on(table.userId),
  index('user_certificates_certificate_serial_idx').on(table.certificateSerial),
  index('user_certificates_cn_dn_idx').on(table.certificateCn, table.certificateDn),
]);

export type UserCertificate = typeof userCertificates.$inferSelect;
export type NewUserCertificate = typeof userCertificates.$inferInsert;
