// ===========================================
// API Key Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api-key.service.js', () => ({
  ApiKeyService: {
    listByUser: vi.fn(),
    create: vi.fn(),
    listAll: vi.fn(),
    getById: vi.fn(),
    setPermissions: vi.fn(),
    revoke: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../services/service-account.service.js', () => ({
  ServiceAccountService: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
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

import { ApiKeyController } from './api-key.controller.js';
import { ApiKeyService } from '../services/api-key.service.js';
import { ServiceAccountService } from '../services/service-account.service.js';
import { ServiceError } from '../lib/service-error.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('ApiKeyController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listMy()', () => {
    it('should return 200 with user keys', async () => {
      const keys = [{ id: 'k1', name: 'My Key' }];
      (ApiKeyService.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: keys });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await ApiKeyController.listMy(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: keys });
    });
  });

  describe('create()', () => {
    it('should return 201 on success', async () => {
      const data = { apiKey: { id: 'k1', name: 'New Key' }, rawKey: 'fst_abc123' };
      (ApiKeyService.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({
        user: { id: 'u1', isAdmin: true },
        body: { name: 'New Key', permissionIds: [] },
      });
      const res = createMockResponse();

      await ApiKeyController.create(req, res as any);

      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true, data });
    });

    it('should return 400 on error', async () => {
      (ApiKeyService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('INVALID_INPUT', 'invalid permission IDs'),
      });

      const req = createMockRequest({
        user: { id: 'u1', isAdmin: true },
        body: { name: 'Key', permissionIds: ['bad'] },
      });
      const res = createMockResponse();

      await ApiKeyController.create(req, res as any);

      expect(res._status).toBe(400);
    });
  });

  describe('list()', () => {
    it('should return 200 with paginated keys', async () => {
      const data = { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      (ApiKeyService.listAll as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({ query: { page: 1, limit: 10 } });
      const res = createMockResponse();

      await ApiKeyController.list(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data });
    });
  });

  describe('get()', () => {
    it('should return 200 with key', async () => {
      const key = { id: 'k1', name: 'Key' };
      (ApiKeyService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: key });

      const req = createMockRequest({ params: { id: 'k1' } });
      const res = createMockResponse();

      await ApiKeyController.get(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: key });
    });

    it('should return 404 if not found', async () => {
      (ApiKeyService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('NOT_FOUND', 'API key not found'),
      });

      const req = createMockRequest({ params: { id: 'k99' } });
      const res = createMockResponse();

      await ApiKeyController.get(req, res as any);

      expect(res._status).toBe(404);
    });
  });

  describe('setPermissions()', () => {
    it('should return 200 on success', async () => {
      const data = { id: 'k1', permissions: [] };
      (ApiKeyService.setPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

      const req = createMockRequest({
        params: { id: 'k1' },
        body: { permissionIds: ['p1'] },
        user: { id: 'u1', isAdmin: true },
      });
      const res = createMockResponse();

      await ApiKeyController.setPermissions(req, res as any);

      expect(res._status).toBe(200);
    });
  });

  describe('revoke()', () => {
    it('should return 200 on success', async () => {
      (ApiKeyService.revoke as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { id: 'k1' } });

      const req = createMockRequest({ params: { id: 'k1' } });
      const res = createMockResponse();

      await ApiKeyController.revoke(req, res as any);

      expect(res._status).toBe(200);
    });
  });

  describe('remove()', () => {
    it('should return 200 on success', async () => {
      (ApiKeyService.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { deleted: true } });

      const req = createMockRequest({ params: { id: 'k1' } });
      const res = createMockResponse();

      await ApiKeyController.remove(req, res as any);

      expect(res._status).toBe(200);
    });
  });

  describe('listServiceAccounts()', () => {
    it('should return 200 with accounts', async () => {
      const accounts = [{ id: 's1', email: 'svc@b.com' }];
      (ServiceAccountService.list as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: accounts });

      const req = createMockRequest();
      const res = createMockResponse();

      await ApiKeyController.listServiceAccounts(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: accounts });
    });
  });

  describe('createServiceAccount()', () => {
    it('should return 201 on success', async () => {
      const account = { id: 's1', email: 'svc@b.com' };
      (ServiceAccountService.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: account });

      const req = createMockRequest({ body: { email: 'svc@b.com' } });
      const res = createMockResponse();

      await ApiKeyController.createServiceAccount(req, res as any);

      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true, data: account });
    });

    it('should return 409 for duplicate email', async () => {
      (ServiceAccountService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('ALREADY_EXISTS', 'Email already exists'),
      });

      const req = createMockRequest({ body: { email: 'svc@b.com' } });
      const res = createMockResponse();

      await ApiKeyController.createServiceAccount(req, res as any);

      expect(res._status).toBe(409);
    });
  });

  describe('deleteServiceAccount()', () => {
    it('should return 200 on success', async () => {
      (ServiceAccountService.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { deleted: true } });

      const req = createMockRequest({ params: { id: 's1' } });
      const res = createMockResponse();

      await ApiKeyController.deleteServiceAccount(req, res as any);

      expect(res._status).toBe(200);
    });
  });
});
