// ===========================================
// MFA Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/mfa.service.js', () => ({
  MfaService: {
    getEnabledMethods: vi.fn(),
    setupTotp: vi.fn(),
    verifyAndEnableTotp: vi.fn(),
    disable: vi.fn(),
    regenerateBackupCodes: vi.fn(),
  },
}));

vi.mock('../services/auth.service.js', () => ({
  AuthService: {
    verifyMfaAndLogin: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../lib/cookies.js', () => ({
  setRefreshTokenCookie: vi.fn(),
  clearRefreshTokenCookie: vi.fn(),
  getRefreshTokenFromCookie: vi.fn(),
}));

import { MfaController } from './mfa.controller.js';
import { MfaService } from '../services/mfa.service.js';
import { AuthService } from '../services/auth.service.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';
import { setRefreshTokenCookie } from '../lib/cookies.js';

describe('MfaController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMethods()', () => {
    it('should return 200 with methods', async () => {
      (MfaService.getEnabledMethods as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: ['totp'] });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await MfaController.getMethods(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: ['totp'] });
    });

    it('should return 500 on error', async () => {
      (MfaService.getEnabledMethods as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await MfaController.getMethods(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('setupTotp()', () => {
    it('should return 200 with setup data', async () => {
      const data = { secret: 'ABCD', qrCodeDataUrl: 'data:image/png;base64,...', method: 'totp' };
      (MfaService.setupTotp as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ user: { id: 'u1', email: 'a@b.com' } });
      const res = createMockResponse();

      await MfaController.setupTotp(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data });
    });

    it('should return 500 on error', async () => {
      (MfaService.setupTotp as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Failed'),
      });

      const req = createMockRequest({ user: { id: 'u1', email: 'a@b.com' } });
      const res = createMockResponse();

      await MfaController.setupTotp(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('verifySetup()', () => {
    it('should return 200 on success', async () => {
      const data = { backupCodes: ['code1', 'code2'] };
      (MfaService.verifyAndEnableTotp as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ user: { id: 'u1' }, body: { code: '123456' } });
      const res = createMockResponse();

      await MfaController.verifySetup(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data });
    });

    it('should return 400 for invalid verification code', async () => {
      (MfaService.verifyAndEnableTotp as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid verification code'),
      });

      const req = createMockRequest({ user: { id: 'u1' }, body: { code: '000000' } });
      const res = createMockResponse();

      await MfaController.verifySetup(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Invalid verification code' });
    });
  });

  describe('verifyLogin()', () => {
    it('should return 200, set cookie, and omit refreshToken from body', async () => {
      const data = { user: { id: 'u1' }, accessToken: 'at', refreshToken: 'rt' };
      (AuthService.verifyMfaAndLogin as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ body: { tempToken: 'temp', method: 'totp', code: '123456' } });
      const res = createMockResponse();

      await MfaController.verifyLogin(req, res as any);

      expect(res._status).toBe(200);
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, 'rt');
      expect(res._json).toEqual({ success: true, data: { user: { id: 'u1' }, accessToken: 'at' } });
    });

    it('should return 401 for invalid MFA code', async () => {
      (AuthService.verifyMfaAndLogin as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid MFA code'),
      });

      const req = createMockRequest({ body: { tempToken: 'temp', method: 'totp', code: 'wrong' } });
      const res = createMockResponse();

      await MfaController.verifyLogin(req, res as any);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({ success: false, error: 'Invalid MFA code' });
    });
  });

  describe('disable()', () => {
    it('should return 200 on success', async () => {
      (MfaService.disable as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ user: { id: 'u1' }, body: { method: 'totp', code: '123456' } });
      const res = createMockResponse();

      await MfaController.disable(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'MFA disabled' } });
    });

    it('should return 400 for invalid code', async () => {
      (MfaService.disable as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid code'),
      });

      const req = createMockRequest({ user: { id: 'u1' }, body: { method: 'totp', code: 'wrong' } });
      const res = createMockResponse();

      await MfaController.disable(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Invalid code' });
    });
  });

  describe('regenerateBackupCodes()', () => {
    it('should return 200 on success', async () => {
      const data = { backupCodes: ['new1', 'new2'] };
      (MfaService.regenerateBackupCodes as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ user: { id: 'u1' }, body: { method: 'totp', code: '123456' } });
      const res = createMockResponse();

      await MfaController.regenerateBackupCodes(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data });
    });

    it('should return 400 for invalid TOTP code', async () => {
      (MfaService.regenerateBackupCodes as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid TOTP code'),
      });

      const req = createMockRequest({ user: { id: 'u1' }, body: { method: 'totp', code: 'wrong' } });
      const res = createMockResponse();

      await MfaController.regenerateBackupCodes(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Invalid TOTP code' });
    });
  });
});
