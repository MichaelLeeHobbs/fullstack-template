// ===========================================
// PKI Audit Logs Table Schema
// ===========================================
// Tracks all PKI-related operations for compliance and forensics.

import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const pkiAuditLogs = pgTable('pki_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: varchar('action', { length: 50 }).notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorIp: varchar('actor_ip', { length: 45 }),
  targetType: varchar('target_type', { length: 30 }).notNull(),
  targetId: uuid('target_id'),
  details: jsonb('details').$type<Record<string, unknown> | null>(),
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('pki_audit_logs_actor_id_idx').on(table.actorId),
  index('pki_audit_logs_target_type_target_id_idx').on(table.targetType, table.targetId),
  index('pki_audit_logs_created_at_idx').on(table.createdAt),
  index('pki_audit_logs_action_idx').on(table.action),
]);

export type PkiAuditLog = typeof pkiAuditLogs.$inferSelect;
export type NewPkiAuditLog = typeof pkiAuditLogs.$inferInsert;
