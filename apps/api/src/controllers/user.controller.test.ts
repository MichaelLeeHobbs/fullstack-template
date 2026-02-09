// ===========================================
// User Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/user.service.js', () => ({
  UserService: {
    getProfile: vi.fn(),
    changePassword: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { UserController } from './user.controller.js';
import { UserService } from '../services/user.service.js';
import { ServiceError } from '../lib/service-error.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('UserController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile()', () => {
    it('should return 200 with profile', async () => {
      const profile = { id: 'u1', email: 'a@b.com', preferences: { theme: 'system' } };
      (UserService.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: profile });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await UserController.getProfile(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: profile });
    });

    it('should return 401 when no user', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await UserController.getProfile(req, res as any);

      expect(res._status).toBe(401);
    });

    it('should return 404 when not found', async () => {
      (UserService.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('User not found'),
      });

      const req = createMockRequest({ user: { id: 'u99' } });
      const res = createMockResponse();

      await UserController.getProfile(req, res as any);

      expect(res._status).toBe(404);
    });
  });

  describe('changePassword()', () => {
    it('should return 200 on success and pass sessionId', async () => {
      (UserService.changePassword as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({
        user: { id: 'u1' },
        sessionId: 's1',
        body: { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' },
      });
      const res = createMockResponse();

      await UserController.changePassword(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'Password changed successfully' } });
      expect(UserService.changePassword).toHaveBeenCalledWith('u1', 'OldPass1!', 'NewPass1!', 's1');
    });

    it('should return 400 for incorrect current password', async () => {
      (UserService.changePassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('INVALID_CREDENTIALS', 'Current password is incorrect'),
      });

      const req = createMockRequest({
        user: { id: 'u1' },
        body: { currentPassword: 'wrong', newPassword: 'NewPass1!' },
      });
      const res = createMockResponse();

      await UserController.changePassword(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Current password is incorrect' });
    });
  });

  describe('getPreferences()', () => {
    it('should return 200 with preferences', async () => {
      const prefs = { theme: 'dark' };
      (UserService.getPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: prefs });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await UserController.getPreferences(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: prefs });
    });
  });

  describe('updatePreferences()', () => {
    it('should return 200 with updated preferences', async () => {
      const prefs = { theme: 'dark' };
      (UserService.updatePreferences as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: prefs });

      const req = createMockRequest({
        user: { id: 'u1' },
        body: { theme: 'dark' },
      });
      const res = createMockResponse();

      await UserController.updatePreferences(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: prefs });
    });
  });
});
