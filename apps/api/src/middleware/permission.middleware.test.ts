// ===========================================
// Permission Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so these are available inside hoisted vi.mock() factories
const {
  mockUserHasAnyPermission,
  mockUserHasAllPermissions,
  mockUserHasPermission,
} = vi.hoisted(() => ({
  mockUserHasAnyPermission: vi.fn(),
  mockUserHasAllPermissions: vi.fn(),
  mockUserHasPermission: vi.fn(),
}));

vi.mock('../services/permission.service.js', () => ({
  PermissionService: {
    userHasAnyPermission: mockUserHasAnyPermission,
    userHasAllPermissions: mockUserHasAllPermissions,
    userHasPermission: mockUserHasPermission,
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  requirePermission,
  requireAllPermissions,
  checkPermission,
} from './permission.middleware.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../test/utils/index.js';

// ---- Helpers ----

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  isAdmin: false,
  isActive: true,
  emailVerified: true,
};

// ---- Tests ----

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no user on request', async () => {
    const middleware = requirePermission('read:users');
    const req = createMockRequest({});
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks all required permissions', async () => {
    mockUserHasAnyPermission.mockResolvedValue(false);

    const middleware = requirePermission('write:users', 'delete:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user has at least one permission', async () => {
    mockUserHasAnyPermission.mockResolvedValue(true);

    const middleware = requirePermission('read:users', 'write:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockUserHasAnyPermission).toHaveBeenCalledWith('user-1', [
      'read:users',
      'write:users',
    ]);
  });

  it('returns 500 when PermissionService throws', async () => {
    mockUserHasAnyPermission.mockRejectedValue(new Error('db down'));

    const middleware = requirePermission('read:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Permission check failed',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAllPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no user', async () => {
    const middleware = requireAllPermissions('read:users', 'write:users');
    const req = createMockRequest({});
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks some required permissions', async () => {
    mockUserHasAllPermissions.mockResolvedValue(false);

    const middleware = requireAllPermissions('read:users', 'write:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user has all permissions', async () => {
    mockUserHasAllPermissions.mockResolvedValue(true);

    const middleware = requireAllPermissions('read:users', 'write:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockUserHasAllPermissions).toHaveBeenCalledWith('user-1', [
      'read:users',
      'write:users',
    ]);
  });
});

describe('checkPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets req.hasPermission=false when no user', async () => {
    const middleware = checkPermission('read:users');
    const req = createMockRequest({});
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect((req as unknown as { hasPermission: boolean }).hasPermission).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it('sets req.hasPermission=true when user has permission', async () => {
    mockUserHasPermission.mockResolvedValue(true);

    const middleware = checkPermission('read:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect((req as unknown as { hasPermission: boolean }).hasPermission).toBe(true);
    expect(next).toHaveBeenCalled();
    expect(mockUserHasPermission).toHaveBeenCalledWith('user-1', 'read:users');
  });

  it('sets req.hasPermission=false when user lacks permission', async () => {
    mockUserHasPermission.mockResolvedValue(false);

    const middleware = checkPermission('write:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect((req as unknown as { hasPermission: boolean }).hasPermission).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it('sets req.hasPermission=false on error and still calls next', async () => {
    mockUserHasPermission.mockRejectedValue(new Error('db down'));

    const middleware = checkPermission('read:users');
    const req = createMockRequest({ user: testUser });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect((req as unknown as { hasPermission: boolean }).hasPermission).toBe(false);
    expect(next).toHaveBeenCalled();
  });
});
