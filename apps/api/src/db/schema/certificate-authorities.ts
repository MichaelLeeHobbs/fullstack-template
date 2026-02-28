// ===========================================
// Certificate Authorities Table Schema
// ===========================================
// Stores CA hierarchy (root and intermediate CAs).

import { pgTable, uuid, varchar, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { pkiPrivateKeys } from './pki-private-keys.js';

// ===========================================
// CA Statuses (const objects, no enums)
// ===========================================

export const CA_STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  RETIRED: 'retired',
} as const;

export type CaStatus = (typeof CA_STATUSES)[keyof typeof CA_STATUSES];

export const certificateAuthorities = pgTable('certificate_authorities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  commonName: varchar('common_name', { length: 255 }).notNull(),
  organization: varchar('organization', { length: 255 }),
  organizationalUnit: varchar('organizational_unit', { length: 255 }),
  country: varchar('country', { length: 2 }),
  state: varchar('state', { length: 128 }),
  locality: varchar('locality', { length: 128 }),
  parentCaId: uuid('parent_ca_id').references((): any => certificateAuthorities.id),
  isRoot: boolean('is_root').default(false).notNull(),
  pathLenConstraint: integer('path_len_constraint'),
  // FK to certificates table will be added once that table exists
  certificateId: uuid('certificate_id'),
  privateKeyId: uuid('private_key_id')
    .notNull()
    .references(() => pkiPrivateKeys.id),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  serialCounter: integer('serial_counter').default(1).notNull(),
  maxValidityDays: integer('max_validity_days').default(3650).notNull(),
  crlDistributionUrl: varchar('crl_distribution_url', { length: 500 }),
  ocspUrl: varchar('ocsp_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('certificate_authorities_parent_ca_id_idx').on(table.parentCaId),
  index('certificate_authorities_status_idx').on(table.status),
]);

export type CertificateAuthority = typeof certificateAuthorities.$inferSelect;
export type NewCertificateAuthority = typeof certificateAuthorities.$inferInsert;
