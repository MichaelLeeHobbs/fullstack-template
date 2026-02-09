// ===========================================
// Session Controller
// ===========================================
// Handles HTTP requests for session management.

import type { Request, Response } from 'express';
import { SessionService } from '../services/session.service.js';
import { AuditService } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import type { SessionIdParam } from '../schemas/session.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class SessionController {
  static async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const currentSessionId = req.sessionId;

    const result = await SessionService.getActiveSessions(userId, currentSessionId);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list sessions');
      res.status(500).json({ success: false, error: 'Failed to list sessions' });
      return;
    }

    res.json({ success: true, data: result.value });
  }

  static async revoke(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id: sessionId } = req.params as unknown as SessionIdParam;

    if (sessionId === req.sessionId) {
      res.status(400).json({ success: false, error: 'Cannot revoke your current session' });
      return;
    }

    const result = await SessionService.revokeSession(userId, sessionId);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }
      logger.error({ error: result.error }, 'Failed to revoke session');
      res.status(500).json({ success: false, error: 'Failed to revoke session' });
      return;
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.SESSION_REVOKED, context, `Session: ${sessionId}`);

    res.json({ success: true, data: { message: 'Session revoked' } });
  }

  static async revokeAll(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const currentSessionId = req.sessionId;

    if (!currentSessionId) {
      res.status(400).json({ success: false, error: 'Current session not identified' });
      return;
    }

    const result = await SessionService.revokeAllOtherSessions(userId, currentSessionId);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to revoke sessions');
      res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
      return;
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.ALL_SESSIONS_REVOKED, context, `Revoked ${result.value.revokedCount} session(s)`);

    res.json({ success: true, data: { message: `Revoked ${result.value.revokedCount} session(s)` } });
  }
}
