// ===========================================
// CRLs Table Schema
// ===========================================
// Certificate Revocation Lists issued by Certificate Authorities.

import { pgTable, uuid, integer, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { certificateAuthorities } from './certificate-authorities.js';

export const crls = pgTable('crls', {
  id: uuid('id').primaryKey().defaultRandom(),
  caId: uuid('ca_id')
    .notNull()
    .references(() => certificateAuthorities.id),
  crlNumber: integer('crl_number').notNull(),
  crlPem: text('crl_pem').notNull(),
  thisUpdate: timestamp('this_update', { withTimezone: true }).notNull(),
  nextUpdate: timestamp('next_update', { withTimezone: true }).notNull(),
  entriesCount: integer('entries_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('crls_ca_id_idx').on(table.caId),
  uniqueIndex('crls_ca_id_crl_number_idx').on(table.caId, table.crlNumber),
]);

export type Crl = typeof crls.$inferSelect;
export type NewCrl = typeof crls.$inferInsert;
