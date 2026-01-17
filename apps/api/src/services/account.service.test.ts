// ===========================================
// Account Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database - must be defined in the factory function
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

// Mock email service
vi.mock('./email.service.js', () => ({
  EmailService: {
    sendVerificationEmail: vi.fn().mockResolvedValue({ ok: true, value: { messageId: 'mock-id' } }),
    sendPasswordResetEmail: vi.fn().mockResolvedValue({ ok: true, value: { messageId: 'mock-id' } }),
  },
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import { AccountService } from './account.service.js';
import { db } from '../lib/db.js';

describe('AccountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      // Setup mocks
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await AccountService.sendVerificationEmail('user-123', 'test@example.com');

      expect(result.ok).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    it('should return error for invalid token', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await AccountService.verifyEmail('invalid-token');

      expect(result.ok).toBe(false);
      expect(result.error?.message).toContain('Invalid or expired');
    });

    it('should verify email with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockToken]),
        }),
      });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await AccountService.verifyEmail('valid-token');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.userId).toBe('user-123');
      }
    });
  });

  describe('requestPasswordReset', () => {
    it('should succeed even if email does not exist (prevent enumeration)', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await AccountService.requestPasswordReset('nonexistent@example.com');

      // Should succeed silently to prevent email enumeration
      expect(result.ok).toBe(true);
    });

    it('should send reset email for existing user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await AccountService.requestPasswordReset('test@example.com');

      expect(result.ok).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should return error for invalid token', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await AccountService.resetPassword('invalid-token', 'newpassword123');

      expect(result.ok).toBe(false);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await AccountService.deactivateUser('user-123');

      expect(result.ok).toBe(true);
    });
  });

  describe('activateUser', () => {
    it('should activate user', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await AccountService.activateUser('user-123');

      expect(result.ok).toBe(true);
    });
  });
});
