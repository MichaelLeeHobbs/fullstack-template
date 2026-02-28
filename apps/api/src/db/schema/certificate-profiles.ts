// ===========================================
// Certificate Profiles Table Schema
// ===========================================
// Defines templates/profiles for certificate issuance.

import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, index } from 'drizzle-orm/pg-core';

// ===========================================
// Certificate Types (const objects, no enums)
// ===========================================

export const CERT_TYPES = {
  SERVER: 'server',
  CLIENT: 'client',
  USER: 'user',
  CA: 'ca',
  SMIME: 'smime',
} as const;

export type CertType = (typeof CERT_TYPES)[keyof typeof CERT_TYPES];

export const certificateProfiles = pgTable('certificate_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  certType: varchar('cert_type', { length: 20 }).notNull(),
  allowedKeyAlgorithms: jsonb('allowed_key_algorithms').$type<string[]>().default(['rsa', 'ecdsa']).notNull(),
  minKeySize: integer('min_key_size').default(2048).notNull(),
  keyUsage: jsonb('key_usage').$type<string[]>().notNull(),
  extKeyUsage: jsonb('ext_key_usage').$type<string[]>().default([]).notNull(),
  basicConstraints: jsonb('basic_constraints').$type<{ ca: boolean; pathLenConstraint?: number } | null>(),
  maxValidityDays: integer('max_validity_days').default(365).notNull(),
  subjectConstraints: jsonb('subject_constraints').$type<Record<string, unknown> | null>(),
  sanConstraints: jsonb('san_constraints').$type<Record<string, unknown> | null>(),
  isBuiltIn: boolean('is_built_in').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('certificate_profiles_cert_type_idx').on(table.certType),
]);

export type CertificateProfile = typeof certificateProfiles.$inferSelect;
export type NewCertificateProfile = typeof certificateProfiles.$inferInsert;
