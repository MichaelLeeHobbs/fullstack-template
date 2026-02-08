// ===========================================
// Auth Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/auth.service.js', () => ({
  AuthService: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../lib/cookies.js', () => ({
  setRefreshTokenCookie: vi.fn(),
  clearRefreshTokenCookie: vi.fn(),
  getRefreshTokenFromCookie: vi.fn((cookies: Record<string, string>) => cookies?.refreshToken),
}));

import { AuthController } from './auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../lib/cookies.js';

describe('AuthController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // register()
  // ===========================================

  describe('register()', () => {
    it('should return 201, set cookie, and omit refreshToken from body', async () => {
      const data = { user: { id: 'u1', email: 'a@b.com', permissions: [] }, accessToken: 'at', refreshToken: 'rt' };
      (AuthService.register as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'Pass123!' } });
      const res = createMockResponse();

      await AuthController.register(req, res as any);

      expect(res._status).toBe(201);
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, 'rt');
      // Response body should NOT contain refreshToken
      expect(res._json).toEqual({
        success: true,
        data: { user: data.user, accessToken: 'at' },
      });
    });

    it('should return 409 for duplicate email', async () => {
      (AuthService.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Email already exists'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'Pass123!' } });
      const res = createMockResponse();

      await AuthController.register(req, res as any);

      expect(res._status).toBe(409);
      expect(res._json).toEqual({ success: false, error: 'Email already registered' });
    });

    it('should return 500 for generic error', async () => {
      (AuthService.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB connection lost'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'Pass123!' } });
      const res = createMockResponse();

      await AuthController.register(req, res as any);

      expect(res._status).toBe(500);
      expect(res._json).toEqual({ success: false, error: 'Registration failed' });
    });
  });

  // ===========================================
  // login()
  // ===========================================

  describe('login()', () => {
    it('should return 200, set cookie, and omit refreshToken from body', async () => {
      const data = { user: { id: 'u1', email: 'a@b.com' }, accessToken: 'at', refreshToken: 'rt' };
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'Pass123!' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(200);
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, 'rt');
      expect(res._json).toEqual({
        success: true,
        data: { user: data.user, accessToken: 'at' },
      });
    });

    it('should return 200 with MFA required (no cookie set)', async () => {
      const data = { mfaRequired: true, mfaMethods: ['totp'], tempToken: 'temp' };
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'Pass123!' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(200);
      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
      expect(res._json).toEqual({ success: true, data });
    });

    it('should return 401 for invalid credentials', async () => {
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid credentials'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({ success: false, error: 'Invalid email or password' });
    });

    it('should return 429 for ACCOUNT_LOCKED with minutes', async () => {
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('ACCOUNT_LOCKED:10'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(429);
      expect(res._json).toEqual({ success: false, error: 'Account is locked. Try again in 10 minute(s).' });
    });

    it('should return 429 for ACCOUNT_LOCKED_NOW', async () => {
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('ACCOUNT_LOCKED_NOW'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(429);
      expect(res._json).toEqual({ success: false, error: 'Too many failed attempts. Account has been temporarily locked.' });
    });

    it('should return 401 for INVALID_CREDENTIALS with remaining attempts', async () => {
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('INVALID_CREDENTIALS:3'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({ success: false, error: 'Invalid email or password. 3 attempt(s) remaining.' });
    });

    it('should return 403 for EMAIL_NOT_VERIFIED', async () => {
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('EMAIL_NOT_VERIFIED'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'Pass123!' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(403);
      expect(res._json).toEqual({ success: false, error: 'EMAIL_NOT_VERIFIED' });
    });

    it('should return 403 for deactivated account', async () => {
      (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Account is deactivated'),
      });

      const req = createMockRequest({ body: { email: 'a@b.com', password: 'Pass123!' } });
      const res = createMockResponse();

      await AuthController.login(req, res as any);

      expect(res._status).toBe(403);
      expect(res._json).toEqual({ success: false, error: 'Account is deactivated' });
    });
  });

  // ===========================================
  // refresh()
  // ===========================================

  describe('refresh()', () => {
    it('should return 200, set new cookie, and return only accessToken', async () => {
      const tokens = { accessToken: 'at2', refreshToken: 'rt2' };
      (AuthService.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: tokens });

      const req = createMockRequest({ cookies: { refreshToken: 'rt1' } });
      const res = createMockResponse();

      await AuthController.refresh(req, res as any);

      expect(res._status).toBe(200);
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, 'rt2');
      expect(res._json).toEqual({ success: true, data: { accessToken: 'at2' } });
    });

    it('should return 401 when no refresh token in cookie or body', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      await AuthController.refresh(req, res as any);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({ success: false, error: 'No refresh token provided' });
    });

    it('should return 401 and clear cookie on invalid token', async () => {
      (AuthService.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Invalid refresh token'),
      });

      const req = createMockRequest({ cookies: { refreshToken: 'bad' } });
      const res = createMockResponse();

      await AuthController.refresh(req, res as any);

      expect(res._status).toBe(401);
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
    });
  });

  // ===========================================
  // logout()
  // ===========================================

  describe('logout()', () => {
    it('should return 200 and clear cookie', async () => {
      (AuthService.logout as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ cookies: { refreshToken: 'rt1' } });
      const res = createMockResponse();

      await AuthController.logout(req, res as any);

      expect(res._status).toBe(200);
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res._json).toEqual({ success: true, data: { message: 'Logged out successfully' } });
    });
  });

  // ===========================================
  // me()
  // ===========================================

  describe('me()', () => {
    it('should return 200 with user data', async () => {
      const user = { id: 'u1', email: 'a@b.com', permissions: ['users:read'] };
      (AuthService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: user });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await AuthController.me(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: user });
    });

    it('should return 401 when no user on request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await AuthController.me(req, res as any);

      expect(res._status).toBe(401);
    });
  });
});
