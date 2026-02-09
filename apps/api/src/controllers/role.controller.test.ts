// ===========================================
// Role Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/role.service.js', () => ({
  RoleService: {
    getAllWithPermissions: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setPermissions: vi.fn(),
  },
}));

vi.mock('../services/user-role.service.js', () => ({
  UserRoleService: {
    getUserRoles: vi.fn(),
    setRoles: vi.fn(),
  },
}));

vi.mock('../services/permission.service.js', () => ({
  PermissionService: {
    getAll: vi.fn(),
    getAllGrouped: vi.fn(),
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

import { RoleController } from './role.controller.js';
import { RoleService } from '../services/role.service.js';
import { UserRoleService } from '../services/user-role.service.js';
import { PermissionService } from '../services/permission.service.js';
import { ServiceError } from '../lib/service-error.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

describe('RoleController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPermissions()', () => {
    it('should return 200 with permissions', async () => {
      const perms = [{ id: 'p1', name: 'users:read' }];
      (PermissionService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: perms });

      const req = createMockRequest();
      const res = createMockResponse();

      await RoleController.listPermissions(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: perms });
    });
  });

  describe('listPermissionsGrouped()', () => {
    it('should return 200 with grouped permissions', async () => {
      const grouped = { users: [{ id: 'p1', name: 'users:read' }] };
      (PermissionService.getAllGrouped as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: grouped });

      const req = createMockRequest();
      const res = createMockResponse();

      await RoleController.listPermissionsGrouped(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: grouped });
    });
  });

  describe('listRoles()', () => {
    it('should return 200 with roles', async () => {
      const roles = [{ id: 'r1', name: 'Admin', permissions: [] }];
      (RoleService.getAllWithPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: roles });

      const req = createMockRequest();
      const res = createMockResponse();

      await RoleController.listRoles(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: roles });
    });
  });

  describe('getRole()', () => {
    it('should return 200 with role', async () => {
      const role = { id: 'r1', name: 'Admin', permissions: [] };
      (RoleService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: role });

      const req = createMockRequest({ params: { id: 'r1' } });
      const res = createMockResponse();

      await RoleController.getRole(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: role });
    });

    it('should return 404 if not found', async () => {
      (RoleService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('NOT_FOUND', 'Role not found'),
      });

      const req = createMockRequest({ params: { id: 'r99' } });
      const res = createMockResponse();

      await RoleController.getRole(req, res as any);

      expect(res._status).toBe(404);
    });
  });

  describe('createRole()', () => {
    it('should return 201 on success', async () => {
      const role = { id: 'r1', name: 'Editor' };
      (RoleService.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: role });

      const req = createMockRequest({ body: { name: 'Editor', description: 'Can edit' } });
      const res = createMockResponse();

      await RoleController.createRole(req, res as any);

      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true, data: role });
    });

    it('should return 409 for duplicate name', async () => {
      (RoleService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('ALREADY_EXISTS', 'Role already exists'),
      });

      const req = createMockRequest({ body: { name: 'Admin' } });
      const res = createMockResponse();

      await RoleController.createRole(req, res as any);

      expect(res._status).toBe(409);
    });
  });

  describe('updateRole()', () => {
    it('should return 200 on success', async () => {
      const role = { id: 'r1', name: 'Updated' };
      (RoleService.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: role });

      const req = createMockRequest({ params: { id: 'r1' }, body: { name: 'Updated' } });
      const res = createMockResponse();

      await RoleController.updateRole(req, res as any);

      expect(res._status).toBe(200);
    });

    it('should return 403 for system role', async () => {
      (RoleService.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('SYSTEM_PROTECTED', 'Cannot modify system role'),
      });

      const req = createMockRequest({ params: { id: 'r1' }, body: { name: 'Hacked' } });
      const res = createMockResponse();

      await RoleController.updateRole(req, res as any);

      expect(res._status).toBe(403);
    });
  });

  describe('deleteRole()', () => {
    it('should return 200 on success', async () => {
      (RoleService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { name: 'Editor' } });
      (RoleService.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ params: { id: 'r1' } });
      const res = createMockResponse();

      await RoleController.deleteRole(req, res as any);

      expect(res._status).toBe(200);
    });

    it('should return 403 for system role', async () => {
      (RoleService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: { name: 'Super Admin' } });
      (RoleService.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new ServiceError('SYSTEM_PROTECTED', 'Cannot delete system role'),
      });

      const req = createMockRequest({ params: { id: 'r1' } });
      const res = createMockResponse();

      await RoleController.deleteRole(req, res as any);

      expect(res._status).toBe(403);
    });
  });

  describe('setRolePermissions()', () => {
    it('should return 200 on success', async () => {
      (RoleService.setPermissions as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
      (RoleService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: { id: 'r1', name: 'Editor', permissions: [] },
      });

      const req = createMockRequest({ params: { id: 'r1' }, body: { permissionIds: ['p1'] } });
      const res = createMockResponse();

      await RoleController.setRolePermissions(req, res as any);

      expect(res._status).toBe(200);
    });
  });

  describe('getUserRoles()', () => {
    it('should return 200 with roles', async () => {
      const roles = [{ id: 'r1', name: 'Admin' }];
      (UserRoleService.getUserRoles as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: roles });

      const req = createMockRequest({ params: { userId: 'u1' } });
      const res = createMockResponse();

      await RoleController.getUserRoles(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: roles });
    });
  });

  describe('setUserRoles()', () => {
    it('should return 200 on success', async () => {
      (UserRoleService.setRoles as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
      (UserRoleService.getUserRoles as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: [{ id: 'r1', name: 'Admin' }],
      });

      const req = createMockRequest({ params: { userId: 'u1' }, body: { roleIds: ['r1'] } });
      const res = createMockResponse();

      await RoleController.setUserRoles(req, res as any);

      expect(res._status).toBe(200);
    });
  });
});
