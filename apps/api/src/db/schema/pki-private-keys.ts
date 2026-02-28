// ===========================================
// PKI Private Keys Table Schema
// ===========================================
// Stores encrypted private keys for CAs and certificates.

import { pgTable, uuid, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';

// ===========================================
// Key Algorithms (const objects, no enums)
// ===========================================

export const KEY_ALGORITHMS = {
  RSA: 'rsa',
  ECDSA: 'ecdsa',
} as const;

export type KeyAlgorithm = (typeof KEY_ALGORITHMS)[keyof typeof KEY_ALGORITHMS];

export const pkiPrivateKeys = pgTable('pki_private_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  algorithm: varchar('algorithm', { length: 20 }).notNull(),
  keySize: integer('key_size'),
  curve: varchar('curve', { length: 20 }),
  encryptedPrivateKeyPem: text('encrypted_private_key_pem').notNull(),
  publicKeyPem: text('public_key_pem').notNull(),
  keyFingerprint: varchar('key_fingerprint', { length: 128 }).notNull().unique(),
  kdfSalt: varchar('kdf_salt', { length: 255 }).notNull(),
  kdfIv: varchar('kdf_iv', { length: 255 }).notNull(),
  kdfTag: varchar('kdf_tag', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('pki_private_keys_key_fingerprint_idx').on(table.keyFingerprint),
]);

export type PkiPrivateKey = typeof pkiPrivateKeys.$inferSelect;
export type NewPkiPrivateKey = typeof pkiPrivateKeys.$inferInsert;
