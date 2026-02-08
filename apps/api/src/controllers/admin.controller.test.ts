// ===========================================
// Admin Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/admin.service.js', () => ({
  AdminService: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    listAuditLogs: vi.fn(),
  },
}));

vi.mock('../services/audit.service.js', () => ({
  AuditService: {
    log: vi.fn().mockResolvedValue(undefined),
    getContextFromRequest: vi.fn().mockReturnValue({ userId: 'admin-1', ipAddress: '127.0.0.1', userAgent: 'test' }),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { AdminController } from './admin.controller.js';
import { AdminService } from '../services/admin.service.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('AdminController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers()', () => {
    it('should return 200 with paginated users', async () => {
      const data = { items: [{ id: 'u1', email: 'a@b.com' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
      (AdminService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ query: { page: 1, limit: 10 } });
      const res = createMockResponse();

      await AdminController.listUsers(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data });
    });

    it('should return 500 on error', async () => {
      (AdminService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({ query: {} });
      const res = createMockResponse();

      await AdminController.listUsers(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('getUser()', () => {
    it('should return 200 with user', async () => {
      const user = { id: 'u1', email: 'a@b.com' };
      (AdminService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: user });

      const req = createMockRequest({ params: { id: 'u1' } });
      const res = createMockResponse();

      await AdminController.getUser(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: user });
    });

    it('should return 404 if not found', async () => {
      (AdminService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('User not found'),
      });

      const req = createMockRequest({ params: { id: 'u99' } });
      const res = createMockResponse();

      await AdminController.getUser(req, res as any);

      expect(res._status).toBe(404);
    });

    it('should return 400 when no ID provided', async () => {
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      await AdminController.getUser(req, res as any);

      expect(res._status).toBe(400);
    });
  });

  describe('updateUser()', () => {
    it('should return 200 on success', async () => {
      const updated = { id: 'u1', email: 'a@b.com', isAdmin: true, isActive: true };
      (AdminService.updateUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: updated });

      const req = createMockRequest({
        params: { id: 'u1' },
        body: { isAdmin: true },
        user: { id: 'admin-1' },
      });
      const res = createMockResponse();

      await AdminController.updateUser(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: updated });
    });

    it('should return 400 for self-demotion', async () => {
      const req = createMockRequest({
        params: { id: 'admin-1' },
        body: { isAdmin: false },
        user: { id: 'admin-1' },
      });
      const res = createMockResponse();

      await AdminController.updateUser(req, res as any);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'Cannot remove your own admin privileges' });
    });
  });

  describe('deleteUser()', () => {
    it('should return 200 on success', async () => {
      (AdminService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { email: 'target@b.com' } });
      (AdminService.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { deleted: true } });

      const req = createMockRequest({ params: { id: 'u1' }, user: { id: 'admin-1' } });
      const res = createMockResponse();

      await AdminController.deleteUser(req, res as any);

      expect(res._status).toBe(200);
    });

    it('should return 400 for self-delete', async () => {
      (AdminService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { email: 'admin@b.com' } });
      (AdminService.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Cannot delete your own account'),
      });

      const req = createMockRequest({ params: { id: 'admin-1' }, user: { id: 'admin-1' } });
      const res = createMockResponse();

      await AdminController.deleteUser(req, res as any);

      expect(res._status).toBe(400);
    });
  });

  describe('listAuditLogs()', () => {
    it('should return 200 with pagination', async () => {
      const data = { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      (AdminService.listAuditLogs as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ query: { page: 1, limit: 10 } });
      const res = createMockResponse();

      await AdminController.listAuditLogs(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data });
    });
  });
});
