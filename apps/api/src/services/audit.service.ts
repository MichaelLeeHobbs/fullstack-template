// ===========================================
// Audit Service
// ===========================================
// Logs security-related events for compliance and debugging.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { auditLogs, type AuditAction, type NewAuditLog } from '../db/schema/index.js';
import logger from '../lib/logger.js';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(
    action: AuditAction,
    context: AuditContext,
    details?: string,
    success = true
  ): Promise<Result<void>> {
    return tryCatch(async () => {
      const entry: NewAuditLog = {
        userId: context.userId,
        action,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent?.substring(0, 500), // Truncate to fit column
        details: details?.substring(0, 1000),
        success,
      };

      await db.insert(auditLogs).values(entry);

      // Also log to console for immediate visibility
      logger.info('Audit event', {
        action,
        userId: context.userId,
        success,
        details,
      });
    });
  }

  /**
   * Helper to extract context from Express request
   */
  static getContextFromRequest(req: {
    ip?: string;
    headers?: { 'user-agent'?: string };
    user?: { id?: string };
  }): AuditContext {
    return {
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
  }
}
