// ===========================================
// Auth Integration Tests
// ===========================================
// Tests the full middleware chain: routing → validation → controller → response.
// Mocks the service layer and database to isolate HTTP concerns.

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

// Mock rate limiters — pass-through
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

// Mock pino-http — pass-through middleware (app.ts uses createRequire for this)
vi.mock('pino-http', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock logger — use real pino (silent) so pino-http internal calls work
vi.mock('../../src/lib/logger.js', async () => {
  const pino = await import('pino');
  return { default: pino.default({ level: 'silent' }) };
});

// Mock AuthService
vi.mock('../../src/services/auth.service.js', () => ({
  AuthService: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    verifyMfaAndLogin: vi.fn(),
  },
}));

// Mock PermissionService (used by auth middleware)
vi.mock('../../src/services/permission.service.js', () => ({
  PermissionService: {
    getUserPermissions: vi.fn().mockResolvedValue(new Set(['users:read'])),
    userHasPermission: vi.fn().mockResolvedValue(true),
    userHasAnyPermission: vi.fn().mockResolvedValue(true),
    userHasAllPermissions: vi.fn().mockResolvedValue(true),
    getAll: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getAllGrouped: vi.fn().mockResolvedValue({ ok: true, value: {} }),
  },
}));

// Mock ApiKeyService (used by auth middleware)
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

// Mock audit service (used by various controllers)
vi.mock('../../src/services/audit.service.js', () => ({
  AuditService: {
    log: vi.fn().mockResolvedValue(undefined),
    getContextFromRequest: vi.fn().mockReturnValue({ userId: undefined, ipAddress: '127.0.0.1', userAgent: 'test' }),
  },
}));

import { createAgent } from './setup.js';
import { AuthService } from '../../src/services/auth.service.js';
import { verifyAccessToken } from '../../src/lib/jwt.js';
import { db } from '../../src/lib/db.js';
import { mockSelectChain } from '../utils/index.js';

describe('Auth Integration Tests', () => {
  let agent: Awaited<ReturnType<typeof createAgent>>;

  beforeAll(async () => {
    agent = await createAgent();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // POST /api/v1/auth/register
  // ===========================================

  it('POST /api/v1/auth/register → 201', async () => {
    const data = { user: { id: 'u1', email: 'a@b.com', permissions: [] }, accessToken: 'at', refreshToken: 'rt' };
    (AuthService.register as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

    const res = await agent
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('a@b.com');
  });

  it('POST /api/v1/auth/register → 400 invalid body (Zod validation)', async () => {
    const res = await agent
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ===========================================
  // POST /api/v1/auth/login
  // ===========================================

  it('POST /api/v1/auth/login → 200', async () => {
    const data = { user: { id: 'u1', email: 'a@b.com' }, accessToken: 'at', refreshToken: 'rt' };
    (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: data });

    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/auth/login → 401 bad credentials', async () => {
    (AuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: new Error('Invalid credentials'),
    });

    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'Wrong123!' });

    expect(res.status).toBe(401);
  });

  // ===========================================
  // POST /api/v1/auth/refresh
  // ===========================================

  it('POST /api/v1/auth/refresh → 200 with cookie', async () => {
    const tokens = { accessToken: 'at2', refreshToken: 'rt2' };
    (AuthService.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: tokens });

    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=old-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('at2');
  });

  it('POST /api/v1/auth/refresh → 200 with body fallback', async () => {
    const tokens = { accessToken: 'at2', refreshToken: 'rt2' };
    (AuthService.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, value: tokens });

    const res = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'old-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ===========================================
  // POST /api/v1/auth/logout
  // ===========================================

  it('POST /api/v1/auth/logout → 200 with cookie', async () => {
    (AuthService.logout as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const res = await agent
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refreshToken=some-token');

    expect(res.status).toBe(200);
  });

  // ===========================================
  // GET /api/v1/auth/me
  // ===========================================

  it('GET /api/v1/auth/me → 401 without token', async () => {
    const res = await agent.get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me → 200 with valid token', async () => {
    // Mock JWT verify to return a valid payload
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 'u1', sessionId: 's1' });

    // Mock db.select for auth middleware user lookup
    const mockUser = {
      id: 'u1',
      email: 'a@b.com',
      isAdmin: false,
      isActive: true,
      emailVerified: true,
    };
    mockSelectChain(db.select as ReturnType<typeof vi.fn>, [mockUser]);

    // Mock AuthService.getUser
    (AuthService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      value: { id: 'u1', email: 'a@b.com', permissions: ['users:read'] },
    });

    const res = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('a@b.com');
  });

  // ===========================================
  // Request ID
  // ===========================================

  it('Response includes X-Request-ID header', async () => {
    (AuthService.logout as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const res = await agent
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refreshToken=token');

    expect(res.headers['x-request-id']).toBeDefined();
  });

  // ===========================================
  // 404
  // ===========================================

  it('Unknown route returns 404', async () => {
    const res = await agent.get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
