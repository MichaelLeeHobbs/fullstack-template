// ===========================================
// PKI Audit Service
// ===========================================
// Logs all PKI operations to the pki_audit_logs table.
// Separate from general audit logs due to different fields and retention needs.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { pkiAuditLogs, type NewPkiAuditLog } from '../db/schema/index.js';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';

// ===========================================
// PKI Audit Actions
// ===========================================

export const PKI_AUDIT_ACTIONS = {
  // CA operations
  CA_CREATED: 'CA_CREATED',
  CA_UPDATED: 'CA_UPDATED',
  CA_SUSPENDED: 'CA_SUSPENDED',
  CA_RETIRED: 'CA_RETIRED',

  // Certificate operations
  CERT_ISSUED: 'CERT_ISSUED',
  CERT_REVOKED: 'CERT_REVOKED',
  CERT_RENEWED: 'CERT_RENEWED',
  CERT_DOWNLOADED: 'CERT_DOWNLOADED',

  // CSR operations
  CSR_SUBMITTED: 'CSR_SUBMITTED',
  CSR_APPROVED: 'CSR_APPROVED',
  CSR_REJECTED: 'CSR_REJECTED',

  // CRL operations
  CRL_GENERATED: 'CRL_GENERATED',

  // Profile operations
  PROFILE_CREATED: 'PROFILE_CREATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PROFILE_DELETED: 'PROFILE_DELETED',

  // Certificate login
  CERT_LOGIN_SUCCESS: 'CERT_LOGIN_SUCCESS',
  CERT_LOGIN_FAILED: 'CERT_LOGIN_FAILED',
  CERT_ATTACHED: 'CERT_ATTACHED',
  CERT_BINDING_REMOVED: 'CERT_BINDING_REMOVED',

  // Key operations
  KEY_GENERATED: 'KEY_GENERATED',
  PASSPHRASE_VERIFIED: 'PASSPHRASE_VERIFIED',
  PASSPHRASE_FAILED: 'PASSPHRASE_FAILED',
} as const;

export type PkiAuditAction = (typeof PKI_AUDIT_ACTIONS)[keyof typeof PKI_AUDIT_ACTIONS];

// ===========================================
// Service
// ===========================================

export interface PkiAuditLogParams {
  action: PkiAuditAction;
  actorId?: string | null;
  actorIp?: string | null;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  success?: boolean;
  errorMessage?: string | null;
}

export interface PkiAuditListParams {
  page?: number;
  limit?: number;
  action?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
}

export class PkiAuditService {
  static async log(params: PkiAuditLogParams): Promise<Result<void>> {
    return tryCatch(async () => {
      await db.insert(pkiAuditLogs).values({
        action: params.action,
        actorId: params.actorId ?? null,
        actorIp: params.actorIp ?? null,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        details: params.details ?? null,
        success: params.success ?? true,
        errorMessage: params.errorMessage ?? null,
      });
    });
  }

  static async list(params: PkiAuditListParams = {}): Promise<Result<{ logs: NewPkiAuditLog[]; total: number }>> {
    return tryCatch(async () => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 50;
      const offset = (page - 1) * limit;

      const conditions: SQL[] = [];

      if (params.action) {
        conditions.push(eq(pkiAuditLogs.action, params.action));
      }
      if (params.targetType) {
        conditions.push(eq(pkiAuditLogs.targetType, params.targetType));
      }
      if (params.targetId) {
        conditions.push(eq(pkiAuditLogs.targetId, params.targetId));
      }
      if (params.actorId) {
        conditions.push(eq(pkiAuditLogs.actorId, params.actorId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, countResult] = await Promise.all([
        db
          .select()
          .from(pkiAuditLogs)
          .where(whereClause)
          .orderBy(desc(pkiAuditLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(pkiAuditLogs)
          .where(whereClause),
      ]);

      return {
        logs,
        total: Number(countResult[0]?.count ?? 0),
      };
    });
  }
}
