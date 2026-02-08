// ===========================================
// Account Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/account.service.js', () => ({
  AccountService: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    sendVerificationEmail: vi.fn(),
  },
}));

vi.mock('../services/audit.service.js', () => ({
  AuditService: {
    log: vi.fn().mockResolvedValue(undefined),
    getContextFromRequest: vi.fn().mockReturnValue({ userId: undefined, ipAddress: '127.0.0.1', userAgent: 'test' }),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { AccountController } from './account.controller.js';
import { AccountService } from '../services/account.service.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('AccountController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('forgotPassword()', () => {
    it('should return 200 always (email enumeration prevention)', async () => {
      (AccountService.requestPasswordReset as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ body: { email: 'a@b.com' } });
      const res = createMockResponse();

      await AccountController.forgotPassword(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: { message: 'If an account with that email exists, a reset link has been sent.' },
      });
    });
  });

  describe('resetPassword()', () => {
    it('should return 200 on success', async () => {
      (AccountService.resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ body: { token: 'valid-token', password: 'NewPass123!' } });
      const res = createMockResponse();

      await AccountController.resetPassword(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: { message: 'Password reset successful. You can now log in.' },
      });
    });

    it('should return 400 for invalid token', async () => {
      (AccountService.resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid or expired reset token'),
      });

      const req = createMockRequest({ body: { token: 'bad', password: 'NewPass123!' } });
      const res = createMockResponse();

      await AccountController.resetPassword(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Invalid or expired reset token' });
    });
  });

  describe('verifyEmail()', () => {
    it('should return 200 on success', async () => {
      (AccountService.verifyEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { userId: 'u1' },
      });

      const req = createMockRequest({ body: { token: 'valid-token' } });
      const res = createMockResponse();

      await AccountController.verifyEmail(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: { message: 'Email verified successfully.' },
      });
    });

    it('should return 400 for invalid token', async () => {
      (AccountService.verifyEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid or expired verification token'),
      });

      const req = createMockRequest({ body: { token: 'bad' } });
      const res = createMockResponse();

      await AccountController.verifyEmail(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Invalid or expired verification token' });
    });
  });

  describe('resendVerification()', () => {
    it('should return 200 on success', async () => {
      (AccountService.sendVerificationEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ user: { id: 'u1', email: 'a@b.com' } });
      const res = createMockResponse();

      await AccountController.resendVerification(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'Verification email sent.' } });
    });

    it('should return 401 when no user', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await AccountController.resendVerification(req, res as any);

      expect(res._status).toBe(401);
    });
  });
});
