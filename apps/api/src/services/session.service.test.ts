// ===========================================
// Session Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete },
  };
});

import { SessionService } from './session.service.js';
import { db } from '../lib/db.js';

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveSessions()', () => {
    it('should return active sessions with isCurrent flag', async () => {
      const sessions = [
        { id: 'sess-1', userAgent: 'Chrome', ipAddress: '127.0.0.1', lastUsedAt: new Date(), createdAt: new Date() },
        { id: 'sess-2', userAgent: 'Firefox', ipAddress: '10.0.0.1', lastUsedAt: new Date(), createdAt: new Date() },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(sessions),
        }),
      });

      const result = await SessionService.getActiveSessions('user-1', 'sess-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]!.isCurrent).toBe(true);
        expect(result.value[1]!.isCurrent).toBe(false);
      }
    });

    it('should return empty array when no active sessions', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await SessionService.getActiveSessions('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should set isCurrent false when no currentSessionId provided', async () => {
      const sessions = [
        { id: 'sess-1', userAgent: 'Chrome', ipAddress: '127.0.0.1', lastUsedAt: new Date(), createdAt: new Date() },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(sessions),
        }),
      });

      const result = await SessionService.getActiveSessions('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0]!.isCurrent).toBe(false);
      }
    });
  });

  describe('revokeSession()', () => {
    it('should revoke an existing session', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'sess-1' }]),
        }),
      });

      const result = await SessionService.revokeSession('user-1', 'sess-1');

      expect(result.ok).toBe(true);
    });

    it('should return error when session not found', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await SessionService.revokeSession('user-1', 'nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('revokeAllUserSessions()', () => {
    it('should revoke all sessions and return count', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'sess-1' }, { id: 'sess-2' }]),
        }),
      });

      const result = await SessionService.revokeAllUserSessions('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.revokedCount).toBe(2);
      }
    });

    it('should return 0 count when no sessions exist', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await SessionService.revokeAllUserSessions('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.revokedCount).toBe(0);
      }
    });
  });

  describe('revokeAllOtherSessions()', () => {
    it('should revoke all sessions except current', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'sess-2' }, { id: 'sess-3' }]),
        }),
      });

      const result = await SessionService.revokeAllOtherSessions('user-1', 'sess-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.revokedCount).toBe(2);
      }
    });

    it('should return 0 when only current session exists', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await SessionService.revokeAllOtherSessions('user-1', 'sess-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.revokedCount).toBe(0);
      }
    });
  });
});
