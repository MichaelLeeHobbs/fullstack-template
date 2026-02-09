// ===========================================
// User Roles Junction Table Schema
// ===========================================
// Links users to their assigned roles.

import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { roles } from './roles.js';

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('user_roles_user_id_idx').on(table.userId),
  ]
);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
