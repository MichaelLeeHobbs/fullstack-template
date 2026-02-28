// ===========================================
// Certificate Requests Table Schema
// ===========================================
// Stores CSR submissions and their approval workflow.

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { certificateAuthorities } from './certificate-authorities.js';
import { certificateProfiles } from './certificate-profiles.js';
import { certificates } from './certificates.js';

// ===========================================
// CSR Statuses (const objects, no enums)
// ===========================================

export const CSR_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type CsrStatus = (typeof CSR_STATUSES)[keyof typeof CSR_STATUSES];

export const certificateRequests = pgTable('certificate_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  csrPem: text('csr_pem').notNull(),
  commonName: varchar('common_name', { length: 255 }).notNull(),
  subjectDn: varchar('subject_dn', { length: 500 }).notNull(),
  sans: jsonb('sans').$type<{ type: string; value: string }[] | null>(),
  targetCaId: uuid('target_ca_id')
    .notNull()
    .references(() => certificateAuthorities.id),
  profileId: uuid('profile_id').references(() => certificateProfiles.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  certificateId: uuid('certificate_id').references(() => certificates.id, { onDelete: 'set null' }),
  requestedBy: uuid('requested_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('certificate_requests_target_ca_id_idx').on(table.targetCaId),
  index('certificate_requests_status_idx').on(table.status),
  index('certificate_requests_requested_by_idx').on(table.requestedBy),
]);

export type CertificateRequest = typeof certificateRequests.$inferSelect;
export type NewCertificateRequest = typeof certificateRequests.$inferInsert;
