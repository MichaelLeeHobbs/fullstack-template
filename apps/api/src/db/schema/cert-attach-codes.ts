// ===========================================
// Certificate Attach Codes Table Schema
// ===========================================
// One-time codes for associating client certificates with user accounts.

import { pgTable, uuid, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const certAttachCodes = pgTable('cert_attach_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  code: uuid('code').notNull().defaultRandom().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('cert_attach_codes_user_id_idx').on(table.userId),
  index('cert_attach_codes_code_idx').on(table.code),
  index('cert_attach_codes_expires_at_idx').on(table.expiresAt),
]);

export type CertAttachCode = typeof certAttachCodes.$inferSelect;
export type NewCertAttachCode = typeof certAttachCodes.$inferInsert;
