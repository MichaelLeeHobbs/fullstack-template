// ===========================================
// Audit Logs Schema
// ===========================================
// Tracks security-related events.

import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// ===========================================
// Audit Action Types
// ===========================================

export const AUDIT_ACTIONS = {
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',

  // Password
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',

  // Email
  EMAIL_VERIFICATION_SENT: 'EMAIL_VERIFICATION_SENT',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',

  // Admin - Users
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DELETED: 'USER_DELETED',
  ADMIN_GRANTED: 'ADMIN_GRANTED',
  ADMIN_REVOKED: 'ADMIN_REVOKED',
  USER_ROLES_UPDATED: 'USER_ROLES_UPDATED',

  // Admin - Roles
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  ROLE_PERMISSIONS_UPDATED: 'ROLE_PERMISSIONS_UPDATED',

  // API Keys
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  API_KEY_DELETED: 'API_KEY_DELETED',
  API_KEY_PERMISSIONS_UPDATED: 'API_KEY_PERMISSIONS_UPDATED',

  // Service Accounts
  SERVICE_ACCOUNT_CREATED: 'SERVICE_ACCOUNT_CREATED',
  SERVICE_ACCOUNT_DELETED: 'SERVICE_ACCOUNT_DELETED',

  // Account Lockout
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',

  // Sessions
  SESSION_REVOKED: 'SESSION_REVOKED',
  ALL_SESSIONS_REVOKED: 'ALL_SESSIONS_REVOKED',

  // MFA
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_BACKUP_USED: 'MFA_BACKUP_USED',
  MFA_BACKUP_REGENERATED: 'MFA_BACKUP_REGENERATED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ===========================================
// Audit Logs Table
// ===========================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  details: varchar('details', { length: 1000 }),
  success: boolean('success').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_logs_user_id_idx').on(table.userId),
  index('audit_logs_created_at_idx').on(table.createdAt),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
