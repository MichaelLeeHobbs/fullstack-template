// ===========================================
// Certificates Table Schema
// ===========================================
// Stores issued X.509 certificates.

import { pgTable, uuid, varchar, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { certificateAuthorities } from './certificate-authorities.js';
import { certificateProfiles } from './certificate-profiles.js';
import { pkiPrivateKeys } from './pki-private-keys.js';

// ===========================================
// Certificate Statuses (const objects, no enums)
// ===========================================

export const CERT_STATUSES = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
} as const;

export type CertStatus = (typeof CERT_STATUSES)[keyof typeof CERT_STATUSES];

export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  issuingCaId: uuid('issuing_ca_id')
    .notNull()
    .references(() => certificateAuthorities.id),
  serialNumber: varchar('serial_number', { length: 64 }).notNull(),
  commonName: varchar('common_name', { length: 255 }).notNull(),
  organization: varchar('organization', { length: 255 }),
  organizationalUnit: varchar('organizational_unit', { length: 255 }),
  country: varchar('country', { length: 2 }),
  state: varchar('state', { length: 128 }),
  locality: varchar('locality', { length: 128 }),
  sans: jsonb('sans').$type<{ type: string; value: string }[] | null>(),
  certificatePem: text('certificate_pem').notNull(),
  fingerprint: varchar('fingerprint', { length: 128 }).notNull().unique(),
  notBefore: timestamp('not_before', { withTimezone: true }).notNull(),
  notAfter: timestamp('not_after', { withTimezone: true }).notNull(),
  certType: varchar('cert_type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  profileId: uuid('profile_id').references(() => certificateProfiles.id, { onDelete: 'set null' }),
  privateKeyId: uuid('private_key_id').references(() => pkiPrivateKeys.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('certificates_issuing_ca_id_idx').on(table.issuingCaId),
  index('certificates_serial_number_idx').on(table.serialNumber),
  index('certificates_status_idx').on(table.status),
  index('certificates_not_after_idx').on(table.notAfter),
  uniqueIndex('certificates_fingerprint_idx').on(table.fingerprint),
]);

export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
