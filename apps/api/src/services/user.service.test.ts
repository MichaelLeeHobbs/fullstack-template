// ===========================================
// User Service Tests
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

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { UserService } from './user.service.js';
import { db } from '../lib/db.js';
import bcrypt from 'bcrypt';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile()', () => {
    it('should return user profile', async () => {
      const profile = {
        id: 'user-1',
        email: 'test@example.com',
        isAdmin: false,
        preferences: { theme: 'system' },
        createdAt: new Date(),
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([profile]),
        }),
      });

      const result = await UserService.getProfile('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe('test@example.com');
      }
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await UserService.getProfile('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('changePassword()', () => {
    it('should change password successfully', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ passwordHash: '$2b$12$oldhash' }]),
        }),
      });

      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$12$newhash');

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await UserService.changePassword('user-1', 'oldpass', 'newpass', 'sess-1');

      expect(result.ok).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 12);
    });

    it('should return error for wrong current password', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ passwordHash: '$2b$12$oldhash' }]),
        }),
      });

      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await UserService.changePassword('user-1', 'wrongpass', 'newpass');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await UserService.changePassword('nonexistent', 'old', 'new');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should not delete other sessions when no currentSessionId provided', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ passwordHash: '$2b$12$oldhash' }]),
        }),
      });

      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$12$newhash');

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await UserService.changePassword('user-1', 'oldpass', 'newpass');

      expect(result.ok).toBe(true);
      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('getPreferences()', () => {
    it('should return user preferences', async () => {
      const prefs = { theme: 'dark' as const };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ preferences: prefs }]),
        }),
      });

      const result = await UserService.getPreferences('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(prefs);
      }
    });

    it('should return default preferences when user has null preferences', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ preferences: null }]),
        }),
      });

      const result = await UserService.getPreferences('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveProperty('theme');
      }
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await UserService.getPreferences('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('updatePreferences()', () => {
    it('should merge and update preferences', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ preferences: { theme: 'light' } }]),
        }),
      });

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await UserService.updatePreferences('user-1', { theme: 'dark' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.theme).toBe('dark');
      }
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await UserService.updatePreferences('nonexistent', { theme: 'dark' });

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
