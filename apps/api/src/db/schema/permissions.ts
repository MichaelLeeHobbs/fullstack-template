// ===========================================
// Permissions Table Schema
// ===========================================
// Atomic permissions following resource:action naming convention.
// Seeded from code, read-only in database.

import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(), // e.g., 'users:read'
  description: varchar('description', { length: 255 }).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(), // e.g., 'users'
  action: varchar('action', { length: 50 }).notNull(), // e.g., 'read'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('permissions_resource_action_idx').on(table.resource, table.action),
]);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
