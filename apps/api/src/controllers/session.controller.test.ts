// ===========================================
// Session Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/session.service.js', () => ({
  SessionService: {
    getActiveSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllOtherSessions: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { SessionController } from './session.controller.js';
import { SessionService } from '../services/session.service.js';
import { ServiceError } from '../lib/service-error.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('SessionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list()', () => {
    it('should return 200 with sessions', async () => {
      const sessions = [{ id: 's1', isCurrent: true }, { id: 's2', isCurrent: false }];
      (SessionService.getActiveSessions as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: sessions });

      const req = createMockRequest({ user: { id: 'u1' }, sessionId: 's1' });
      const res = createMockResponse();

      await SessionController.list(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: sessions });
    });

    it('should return 500 on error', async () => {
      (SessionService.getActiveSessions as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({ user: { id: 'u1' }, sessionId: 's1' });
      const res = createMockResponse();

      await SessionController.list(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('revoke()', () => {
    it('should return 200 on success', async () => {
      (SessionService.revokeSession as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ user: { id: 'u1' }, sessionId: 's1', params: { id: 's2' } });
      const res = createMockResponse();

      await SessionController.revoke(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'Session revoked' } });
    });

    it('should return 400 when revoking current session', async () => {
      const req = createMockRequest({ user: { id: 'u1' }, sessionId: 's1', params: { id: 's1' } });
      const res = createMockResponse();

      await SessionController.revoke(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Cannot revoke your current session' });
    });

    it('should return 404 when session not found', async () => {
      (SessionService.revokeSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('NOT_FOUND', 'Session not found'),
      });

      const req = createMockRequest({ user: { id: 'u1' }, sessionId: 's1', params: { id: 's99' } });
      const res = createMockResponse();

      await SessionController.revoke(req, res as any);

      expect(res._status).toBe(404);
      expect(res._json).toEqual({ success: false, error: 'Session not found' });
    });
  });

  describe('revokeAll()', () => {
    it('should return 200 on success', async () => {
      (SessionService.revokeAllOtherSessions as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { revokedCount: 3 },
      });

      const req = createMockRequest({ user: { id: 'u1' }, sessionId: 's1' });
      const res = createMockResponse();

      await SessionController.revokeAll(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'Revoked 3 session(s)' } });
    });

    it('should return 400 when no currentSessionId', async () => {
      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await SessionController.revokeAll(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Current session not identified' });
    });
  });
});
