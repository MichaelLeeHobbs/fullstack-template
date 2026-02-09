// ===========================================
// Admin Integration Tests
// ===========================================
// Tests admin routes with full middleware chain including auth + permission checks.

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// Mock database
vi.mock('../../src/lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
    return cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
  });
  return {
    db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, transaction: mockTransaction },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction },
  };
});

// Mock rate limiters
vi.mock('../../src/middleware/rateLimit.middleware.js', () => {
  const passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    authRateLimiter: passThrough,
    registrationRateLimiter: passThrough,
    passwordResetRateLimiter: passThrough,
    apiRateLimiter: passThrough,
    apiKeyRateLimiter: passThrough,
  };
});

// Mock pino-http
vi.mock('pino-http', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock logger — use real pino (silent) so pino-http internal calls work
vi.mock('../../src/lib/logger.js', async () => {
  const pino = await import('pino');
  return { default: pino.default({ level: 'silent' }) };
});

// Mock AdminService
vi.mock('../../src/services/admin.service.js', () => ({
  AdminService: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    listAuditLogs: vi.fn(),
  },
}));

// Mock PermissionService
vi.mock('../../src/services/permission.service.js', () => ({
  PermissionService: {
    getUserPermissions: vi.fn().mockResolvedValue(new Set(['users:read', 'users:update', 'users:delete', 'audit:read'])),
    userHasPermission: vi.fn().mockResolvedValue(true),
    userHasAnyPermission: vi.fn().mockResolvedValue(true),
    userHasAllPermissions: vi.fn().mockResolvedValue(true),
    getAll: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getAllGrouped: vi.fn().mockResolvedValue({ ok: true, value: {} }),
  },
}));

// Mock ApiKeyService
vi.mock('../../src/services/api-key.service.js', () => ({
  ApiKeyService: {
    validateKey: vi.fn().mockResolvedValue({ ok: false, error: new Error('Invalid') }),
  },
}));

// Mock JWT
vi.mock('../../src/lib/jwt.js', () => ({
  signAccessToken: vi.fn().mockReturnValue('mock-access'),
  signRefreshToken: vi.fn().mockReturnValue('mock-refresh'),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  signMfaTempToken: vi.fn(),
  verifyMfaTempToken: vi.fn(),
}));

// Mock AuditService
vi.mock('../../src/services/audit.service.js', () => ({
  AuditService: {
    log: vi.fn().mockResolvedValue(undefined),
    getContextFromRequest: vi.fn().mockReturnValue({ userId: 'admin-1', ipAddress: '127.0.0.1', userAgent: 'test' }),
  },
}));

// Mock SettingsService (admin routes include settings routes)
vi.mock('../../src/services/settings.service.js', () => ({
  SettingsService: {
    getAll: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { createAgent } from './setup.js';
import { AdminService } from '../../src/services/admin.service.js';
import { PermissionService } from '../../src/services/permission.service.js';
import { verifyAccessToken } from '../../src/lib/jwt.js';
import { db } from '../../src/lib/db.js';
import { mockSelectChain } from '../utils/index.js';

function setupAuthenticatedAdmin() {
  (verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 'admin-1', sessionId: 's1' });
  mockSelectChain(db.select as ReturnType<typeof vi.fn>, [{
    id: 'admin-1',
    email: 'admin@test.com',
    isAdmin: true,
    isActive: true,
    emailVerified: true,
  }]);
}

function setupAuthenticatedNonAdmin() {
  (verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 'user-1', sessionId: 's1' });
  mockSelectChain(db.select as ReturnType<typeof vi.fn>, [{
    id: 'user-1',
    email: 'user@test.com',
    isAdmin: false,
    isActive: true,
    emailVerified: true,
  }]);
  (PermissionService.userHasAnyPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
}

describe('Admin Integration Tests', () => {
  let agent: Awaited<ReturnType<typeof createAgent>>;

  beforeAll(async () => {
    agent = await createAgent();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: permission checks pass
    (PermissionService.userHasAnyPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (PermissionService.getUserPermissions as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Set(['users:read', 'users:update', 'users:delete', 'audit:read'])
    );
  });

  // ===========================================
  // GET /api/v1/admin/users
  // ===========================================

  it('GET /api/v1/admin/users → 401 no token', async () => {
    const res = await agent.get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/users → 403 not admin (no permission)', async () => {
    setupAuthenticatedNonAdmin();

    const res = await agent
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/admin/users → 200 with admin + pagination', async () => {
    setupAuthenticatedAdmin();

    const data = {
      items: [{ id: 'u1', email: 'a@b.com' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    (AdminService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

    const res = await agent
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  // ===========================================
  // GET /api/v1/admin/users/:id
  // ===========================================

  it('GET /api/v1/admin/users/:id → 200', async () => {
    setupAuthenticatedAdmin();

    const user = { id: '10000000-0000-4000-8000-000000000001', email: 'a@b.com', isAdmin: false };
    (AdminService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: user });

    const res = await agent
      .get('/api/v1/admin/users/10000000-0000-4000-8000-000000000001')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('a@b.com');
  });

  it('GET /api/v1/admin/users/:id → 404', async () => {
    setupAuthenticatedAdmin();

    (AdminService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: new Error('User not found'),
    });

    const res = await agent
      .get('/api/v1/admin/users/10000000-0000-4000-8000-000000000099')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
  });

  // ===========================================
  // PATCH /api/v1/admin/users/:id
  // ===========================================

  it('PATCH /api/v1/admin/users/:id → 400 self-demotion', async () => {
    // Set up user where admin tries to demote themselves
    const adminId = '10000000-0000-4000-8000-000000000010';
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: adminId, sessionId: 's1' });
    mockSelectChain(db.select as ReturnType<typeof vi.fn>, [{
      id: adminId,
      email: 'admin@test.com',
      isAdmin: true,
      isActive: true,
      emailVerified: true,
    }]);

    const res = await agent
      .patch(`/api/v1/admin/users/${adminId}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ isAdmin: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot remove your own admin privileges');
  });
});
