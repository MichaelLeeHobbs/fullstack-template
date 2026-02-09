// ===========================================
// Account Lockout Service Tests
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

vi.mock('./settings.service.js', () => ({
  SettingsService: {
    get: vi.fn().mockImplementation((_key: string, defaultValue: unknown) => Promise.resolve(defaultValue)),
  },
}));

import { AccountLockoutService } from './account-lockout.service.js';
import { db } from '../lib/db.js';
import { SettingsService } from './settings.service.js';

describe('AccountLockoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock for SettingsService.get
    (SettingsService.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_key: string, defaultValue: unknown) => Promise.resolve(defaultValue)
    );
  });

  describe('isLocked()', () => {
    it('should return not locked when lockedUntil is null', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ lockedUntil: null }]),
        }),
      });

      const result = await AccountLockoutService.isLocked('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.locked).toBe(false);
        expect(result.value.minutesRemaining).toBe(0);
      }
    });

    it('should return locked with minutes remaining', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ lockedUntil }]),
        }),
      });

      const result = await AccountLockoutService.isLocked('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.locked).toBe(true);
        expect(result.value.minutesRemaining).toBeGreaterThan(0);
        expect(result.value.minutesRemaining).toBeLessThanOrEqual(10);
      }
    });

    it('should return not locked when lockedUntil is in the past', async () => {
      const lockedUntil = new Date(Date.now() - 60000); // 1 minute ago

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ lockedUntil }]),
        }),
      });

      const result = await AccountLockoutService.isLocked('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.locked).toBe(false);
      }
    });

    it('should return error when user not found', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await AccountLockoutService.isLocked('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error?.message).toContain('User not found');
    });
  });

  describe('recordFailedAttempt()', () => {
    it('should record attempt and return remaining attempts when below threshold', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ failedLoginAttempts: 2 }]),
          }),
        }),
      });

      const result = await AccountLockoutService.recordFailedAttempt('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.locked).toBe(false);
        expect(result.value.attemptsRemaining).toBe(3); // 5 - 2
      }
    });

    it('should lock account when threshold reached', async () => {
      // First update: increment count
      const mockUpdateSet = vi.fn();
      const mockUpdateWhere = vi.fn();
      const mockUpdateReturning = vi.fn();

      // First call: increment and return count at threshold
      mockUpdateReturning.mockResolvedValueOnce([{ failedLoginAttempts: 5 }]);
      mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
      mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

      // Second call: set lockedUntil (no returning)
      const mockSetLockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSetLockSet = vi.fn().mockReturnValue({ where: mockSetLockWhere });

      let callCount = 0;
      (db.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { set: mockUpdateSet };
        }
        return { set: mockSetLockSet };
      });

      const result = await AccountLockoutService.recordFailedAttempt('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.locked).toBe(true);
        expect(result.value.attemptsRemaining).toBe(0);
      }
    });

    it('should return error when user not found', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await AccountLockoutService.recordFailedAttempt('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error?.message).toContain('User not found');
    });
  });

  describe('resetAttempts()', () => {
    it('should reset failed attempts and lockedUntil', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await AccountLockoutService.resetAttempts('user-1');

      expect(result.ok).toBe(true);
    });
  });
});
