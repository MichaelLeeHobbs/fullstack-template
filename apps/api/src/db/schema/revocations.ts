// ===========================================
// Revocations Table Schema
// ===========================================
// Certificate revocation records using RFC 5280 reason codes.

import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { certificates } from './certificates.js';
import { users } from './users.js';

// ===========================================
// Revocation Reasons (RFC 5280)
// ===========================================

export const REVOCATION_REASONS = {
  UNSPECIFIED: 'unspecified',
  KEY_COMPROMISE: 'keyCompromise',
  CA_COMPROMISE: 'caCompromise',
  AFFILIATION_CHANGED: 'affiliationChanged',
  SUPERSEDED: 'superseded',
  CESSATION_OF_OPERATION: 'cessationOfOperation',
  CERTIFICATE_HOLD: 'certificateHold',
  REMOVE_FROM_CRL: 'removeFromCRL',
  PRIVILEGE_WITHDRAWN: 'privilegeWithdrawn',
  AA_COMPROMISE: 'aACompromise',
} as const;

export type RevocationReason = (typeof REVOCATION_REASONS)[keyof typeof REVOCATION_REASONS];

// ===========================================
// Revocations Table
// ===========================================

export const revocations = pgTable('revocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  certificateId: uuid('certificate_id')
    .notNull()
    .unique()
    .references(() => certificates.id),
  reason: varchar('reason', { length: 30 }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }).defaultNow().notNull(),
  invalidityDate: timestamp('invalidity_date', { withTimezone: true }),
  revokedBy: uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('revocations_revoked_at_idx').on(table.revokedAt),
]);

export type Revocation = typeof revocations.$inferSelect;
export type NewRevocation = typeof revocations.$inferInsert;
