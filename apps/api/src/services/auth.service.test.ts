// ===========================================
// Auth Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
    return cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
  });

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      transaction: mockTransaction,
    },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction },
  };
});

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock JWT
vi.mock('../lib/jwt.js', () => ({
  signAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
  signMfaTempToken: vi.fn().mockReturnValue('mock-mfa-temp-token'),
  verifyMfaTempToken: vi.fn().mockReturnValue({ userId: 'user-1', purpose: 'mfa' }),
}));

// Mock PermissionService
vi.mock('./permission.service.js', () => ({
  PermissionService: {
    getUserPermissions: vi.fn().mockResolvedValue(new Set(['users:read'])),
  },
}));

// Mock job queue
vi.mock('../jobs/index.js', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  EMAIL_QUEUES: { VERIFICATION: 'email.verification', PASSWORD_RESET: 'email.password-reset' },
}));

// Mock AccountLockoutService
vi.mock('./account-lockout.service.js', () => ({
  AccountLockoutService: {
    isLocked: vi.fn().mockResolvedValue({ ok: true, value: { locked: false, minutesRemaining: 0 } }),
    recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true, value: { locked: false, attemptsRemaining: 4 } }),
    resetAttempts: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

// Mock MfaService
vi.mock('./mfa.service.js', () => ({
  MfaService: {
    getEnabledMethods: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    verify: vi.fn().mockResolvedValue({ ok: true, value: { valid: true, backupUsed: false } }),
  },
}));

// Mock SettingsService
vi.mock('./settings.service.js', () => ({
  SettingsService: {
    get: vi.fn().mockResolvedValue(true),
  },
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { AuthService } from './auth.service.js';
import { db } from '../lib/db.js';
import bcrypt from 'bcrypt';
import { verifyMfaTempToken } from '../lib/jwt.js';
import { enqueue } from '../jobs/index.js';
import { AccountLockoutService } from './account-lockout.service.js';
import { MfaService } from './mfa.service.js';
import {
  mockSelectChain,
  mockInsertChain,
  mockUpdateSetWhereChain,
  mockDeleteChain,
  createTestUser,
  createTestSession,
} from '../../test/utils/index.js';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mocks
    (AccountLockoutService.isLocked as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { locked: false, minutesRemaining: 0 } });
    (AccountLockoutService.recordFailedAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { locked: false, attemptsRemaining: 4 } });
    (MfaService.getEnabledMethods as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: [] });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  // ===========================================
  // register()
  // ===========================================

  describe('register()', () => {
    it('should create user with hashed password and return tokens + user with permissions', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isAdmin: false,
        preferences: { theme: 'system' },
        createdAt: new Date(),
      };

      // check existing email → none found
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, []);

      // transaction: insert user, insert verification token
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const insert = vi.fn();
        // first insert: user
        insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUser]),
          }),
        });
        // second insert: email verification token
        insert.mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        });
        return cb({ insert, select: vi.fn(), update: vi.fn(), delete: vi.fn() });
      });

      // createTokens: insert session
      mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [{ id: 'session-1' }]);

      const result = await AuthService.register('test@example.com', 'Password123!');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.user.email).toBe('test@example.com');
        expect(result.value.user.permissions).toEqual(['users:read']);
        expect(result.value.accessToken).toBe('mock-access-token');
        expect(result.value.refreshToken).toBe('mock-refresh-token');
      }
    });

    it('should return error if email already exists', async () => {
      const existingUser = createTestUser({ email: 'existing@example.com' });
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [existingUser]);

      const result = await AuthService.register('existing@example.com', 'Password123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('already exists');
      }
    });

    it('should create email verification token in transaction', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isAdmin: false,
        preferences: { theme: 'system' },
        createdAt: new Date(),
      };

      mockSelectChain(db.select as ReturnType<typeof vi.fn>, []);

      const txInsert = vi.fn();
      txInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      txInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      });

      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        return cb({ insert: txInsert, select: vi.fn(), update: vi.fn(), delete: vi.fn() });
      });

      mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [{ id: 'session-1' }]);

      const result = await AuthService.register('test@example.com', 'Password123!');

      expect(result.ok).toBe(true);
      expect(txInsert).toHaveBeenCalledTimes(2); // user + verification token
    });

    it('should send verification email after transaction commits', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isAdmin: false,
        preferences: { theme: 'system' },
        createdAt: new Date(),
      };

      mockSelectChain(db.select as ReturnType<typeof vi.fn>, []);

      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => {
        const insert = vi.fn();
        insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUser]),
          }),
        });
        insert.mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        });
        return cb({ insert, select: vi.fn(), update: vi.fn(), delete: vi.fn() });
      });

      mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [{ id: 'session-1' }]);

      await AuthService.register('test@example.com', 'Password123!');

      expect(enqueue).toHaveBeenCalledWith('email.verification', { email: 'test@example.com', token: expect.any(String) });
    });
  });

  // ===========================================
  // login()
  // ===========================================

  describe('login()', () => {
    const loginUser = createTestUser({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: '$2b$12$hashed',
      emailVerified: true,
      isActive: true,
    });

    it('should return tokens for valid credentials (no MFA)', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [loginUser]);
      mockUpdateSetWhereChain(db.update as ReturnType<typeof vi.fn>);
      mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [{ id: 'session-1' }]);

      const result = await AuthService.login('test@example.com', 'Password123!');

      expect(result.ok).toBe(true);
      if (result.ok && !('mfaRequired' in result.value && result.value.mfaRequired)) {
        expect(result.value.accessToken).toBe('mock-access-token');
        expect(result.value.refreshToken).toBe('mock-refresh-token');
        expect(result.value.user.email).toBe('test@example.com');
      }
    });

    it('should return error for nonexistent email', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, []);

      const result = await AuthService.login('nobody@example.com', 'Password123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid credentials');
      }
    });

    it('should return error for incorrect password and call recordFailedAttempt', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [loginUser]);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await AuthService.login('test@example.com', 'wrong');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('INVALID_CREDENTIALS');
      }
      expect(AccountLockoutService.recordFailedAttempt).toHaveBeenCalledWith(loginUser.id);
    });

    it('should return error for service account (no passwordHash)', async () => {
      const serviceUser = createTestUser({ accountType: 'service', passwordHash: null });
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [serviceUser]);

      const result = await AuthService.login('service@example.com', 'Password123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Service accounts cannot log in');
      }
    });

    it('should return error if account locked', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [loginUser]);
      (AccountLockoutService.isLocked as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { locked: true, minutesRemaining: 10 },
      });

      const result = await AuthService.login('test@example.com', 'Password123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('ACCOUNT_LOCKED:10');
      }
    });

    it('should return ACCOUNT_LOCKED_NOW when lockout threshold reached', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [loginUser]);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (AccountLockoutService.recordFailedAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { locked: true, attemptsRemaining: 0 },
      });

      const result = await AuthService.login('test@example.com', 'wrong');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('ACCOUNT_LOCKED_NOW');
      }
    });

    it('should include remaining attempts in error message', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [loginUser]);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (AccountLockoutService.recordFailedAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { locked: false, attemptsRemaining: 3 },
      });

      const result = await AuthService.login('test@example.com', 'wrong');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('INVALID_CREDENTIALS:3');
      }
    });

    it('should return EMAIL_NOT_VERIFIED when emailVerified=false', async () => {
      const unverifiedUser = createTestUser({ ...loginUser, emailVerified: false });
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [unverifiedUser]);

      const result = await AuthService.login('test@example.com', 'Password123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('EMAIL_NOT_VERIFIED');
      }
    });

    it('should return error if account deactivated (isActive=false)', async () => {
      const inactiveUser = createTestUser({ ...loginUser, isActive: false });
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [inactiveUser]);

      const result = await AuthService.login('test@example.com', 'Password123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('deactivated');
      }
    });

    it('should return MFA required with temp token when MFA is enabled', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [loginUser]);
      mockUpdateSetWhereChain(db.update as ReturnType<typeof vi.fn>);
      (MfaService.getEnabledMethods as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: ['totp'],
      });

      const result = await AuthService.login('test@example.com', 'Password123!');

      expect(result.ok).toBe(true);
      if (result.ok && 'mfaRequired' in result.value) {
        const mfaResult = result.value as { mfaRequired: true; tempToken: string; mfaMethods: string[] };
        expect(mfaResult.mfaRequired).toBe(true);
        expect(mfaResult.tempToken).toBe('mock-mfa-temp-token');
        expect(mfaResult.mfaMethods).toEqual(['totp']);
      }
    });

    it('should reset lockout and update lastLoginAt on success', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [loginUser]);
      mockUpdateSetWhereChain(db.update as ReturnType<typeof vi.fn>);
      mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [{ id: 'session-1' }]);

      await AuthService.login('test@example.com', 'Password123!');

      expect(AccountLockoutService.resetAttempts).toHaveBeenCalledWith(loginUser.id);
      expect(db.update).toHaveBeenCalled();
    });
  });

  // ===========================================
  // verifyMfaAndLogin()
  // ===========================================

  describe('verifyMfaAndLogin()', () => {
    it('should return tokens on valid MFA code', async () => {
      const user = createTestUser({ id: 'user-1' });
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [user]);
      mockUpdateSetWhereChain(db.update as ReturnType<typeof vi.fn>);
      mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [{ id: 'session-1' }]);

      const result = await AuthService.verifyMfaAndLogin('mock-temp-token', 'totp', '123456');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.accessToken).toBe('mock-access-token');
        expect(result.value.refreshToken).toBe('mock-refresh-token');
      }
    });

    it('should return error on invalid temp token', async () => {
      (verifyMfaTempToken as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await AuthService.verifyMfaAndLogin('bad-token', 'totp', '123456');

      expect(result.ok).toBe(false);
    });

    it('should return error on invalid MFA code', async () => {
      (verifyMfaTempToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 'user-1', purpose: 'mfa' });
      (MfaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { valid: false, backupUsed: false },
      });

      const result = await AuthService.verifyMfaAndLogin('mock-temp-token', 'totp', 'wrong');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid MFA code');
      }
    });
  });

  // ===========================================
  // refresh()
  // ===========================================

  describe('refresh()', () => {
    it('should return new tokens and delete old session', async () => {
      const session = createTestSession({ refreshToken: 'old-token' });
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [session]);
      mockDeleteChain(db.delete as ReturnType<typeof vi.fn>);
      mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [{ id: 'session-2' }]);

      const result = await AuthService.refresh('old-token');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.accessToken).toBe('mock-access-token');
        expect(result.value.refreshToken).toBe('mock-refresh-token');
      }
      expect(db.delete).toHaveBeenCalled();
    });

    it('should return error for expired/missing session', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, []);

      const result = await AuthService.refresh('nonexistent-token');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid refresh token');
      }
    });
  });

  // ===========================================
  // logout()
  // ===========================================

  describe('logout()', () => {
    it('should delete session by refresh token', async () => {
      mockDeleteChain(db.delete as ReturnType<typeof vi.fn>);

      const result = await AuthService.logout('some-refresh-token');

      expect(result.ok).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  // ===========================================
  // getUser()
  // ===========================================

  describe('getUser()', () => {
    it('should return user with permissions', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        isAdmin: false,
        preferences: { theme: 'system' },
        createdAt: new Date(),
      };
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, [user]);

      const result = await AuthService.getUser('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe('test@example.com');
        expect(result.value.permissions).toEqual(['users:read']);
      }
    });

    it('should return error if user not found', async () => {
      mockSelectChain(db.select as ReturnType<typeof vi.fn>, []);

      const result = await AuthService.getUser('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('User not found');
      }
    });
  });
});
