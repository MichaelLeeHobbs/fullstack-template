// ===========================================
// Session Controller
// ===========================================
// Handles HTTP requests for session management.

import type { Request, Response } from 'express';
import { SessionService } from '../services/session.service.js';
import type { SessionIdParam } from '../schemas/session.schema.js';
import logger from '../lib/logger.js';

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
      if (result.error.message === 'Session not found') {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }
      logger.error({ error: result.error }, 'Failed to revoke session');
      res.status(500).json({ success: false, error: 'Failed to revoke session' });
      return;
    }

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

    res.json({ success: true, data: { message: `Revoked ${result.value.revokedCount} session(s)` } });
  }
}
