// ===========================================
// PKI Audit Controller
// ===========================================
// Handles PKI audit log listing with pagination and filters.

import type { Request, Response } from 'express';
import { PkiAuditService } from '../services/pki-audit.service.js';
import type { ListPkiAuditQuery } from '../schemas/pki-audit.schema.js';
import logger from '../lib/logger.js';

export class PkiAuditController {
  /**
   * GET /api/v1/pki-audit
   * List PKI audit logs with pagination and filters
   */
  static async list(req: Request, res: Response): Promise<void> {
    const { page, limit, action, targetType, targetId, actorId } =
      req.query as unknown as ListPkiAuditQuery;

    const result = await PkiAuditService.list({ page, limit, action, targetType, targetId, actorId });

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list PKI audit logs');
      return void res.status(500).json({ success: false, error: 'Failed to list PKI audit logs' });
    }

    const { logs, total } = result.value;

    res.json({
      success: true,
      data: {
        data: logs,
        pagination: {
          page: page ?? 1,
          limit: limit ?? 50,
          total,
          totalPages: Math.ceil(total / (limit ?? 50)),
        },
      },
    });
  }
}
