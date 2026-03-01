// ===========================================
// Auth Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so these are available inside hoisted vi.mock() factories
const {
  mockVerifyAccessToken,
  mockSelect,
  mockGetUserPermissions,
  mockValidateKey,
} = vi.hoisted(() => ({
  mockVerifyAccessToken: vi.fn(),
  mockSelect: vi.fn(),
  mockGetUserPermissions: vi.fn(),
  mockValidateKey: vi.fn(),
}));

vi.mock('../lib/jwt.js', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

vi.mock('../lib/db.js', () => ({
  db: { select: (...args: unknown[]) => mockSelect(...args) },
}));

vi.mock('../db/schema/index.js', () => ({ users: {} }));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../services/permission.service.js', () => ({
  PermissionService: { getUserPermissions: mockGetUserPermissions },
}));

vi.mock('../services/api-key.service.js', () => ({
  ApiKeyService: { validateKey: mockValidateKey },
}));

import { authenticate, optionalAuth } from './auth.middleware.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  mockSelectChain,
} from '../../test/utils/index.js';

// ---- Helpers ----

const activeUser = {
  id: 'user-1',
  email: 'test@example.com',
  isAdmin: false,
  isActive: true,
  emailVerified: true,
};

const inactiveUser = { ...activeUser, isActive: false };

// ---- Tests ----

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header and no API key', async () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when auth header doesn't start with 'Bearer '", async () => {
    const req = createMockRequest({ headers: { authorization: 'Basic abc123' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when JWT verification fails', async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('token expired');
    });

    const req = createMockRequest({ headers: { authorization: 'Bearer bad-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user not found in db', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'missing-id', sessionId: 's1' });
    mockSelectChain(mockSelect, []);

    const req = createMockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not active', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', sessionId: 's1' });
    mockSelectChain(mockSelect, [inactiveUser]);

    const req = createMockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Account is deactivated',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user when token is valid and user is active', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', sessionId: 's1' });
    mockSelectChain(mockSelect, [activeUser]);
    mockGetUserPermissions.mockResolvedValue(new Set(['read:users']));

    const req = createMockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      ...activeUser,
      permissions: ['read:users'],
    });
    expect(req.sessionId).toBe('s1');
  });

  it('authenticates via X-API-Key header when present', async () => {
    mockValidateKey.mockResolvedValue({
      ok: true,
      value: {
        apiKey: { id: 'key-1' },
        userId: 'user-1',
        permissions: new Set(['read:data']),
      },
    });
    mockSelectChain(mockSelect, [activeUser]);

    const req = createMockRequest({ headers: { 'x-api-key': 'my-api-key' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(mockValidateKey).toHaveBeenCalledWith('my-api-key');
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      ...activeUser,
      permissions: ['read:data'],
    });
    expect(req.apiKeyId).toBe('key-1');
  });

  it('returns 401 when API key is invalid', async () => {
    mockValidateKey.mockResolvedValue({
      ok: false,
      error: new Error('Invalid API key'),
    });

    const req = createMockRequest({ headers: { 'x-api-key': 'bad-key' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired API key',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when API key owner is not active', async () => {
    mockValidateKey.mockResolvedValue({
      ok: true,
      value: {
        apiKey: { id: 'key-1' },
        userId: 'user-1',
        permissions: new Set(['read:data']),
      },
    });
    mockSelectChain(mockSelect, [inactiveUser]);

    const req = createMockRequest({ headers: { 'x-api-key': 'my-api-key' } });
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'API key owner account is deactivated',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() without setting req.user when no auth header', async () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('sets req.user when valid Bearer token provided', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', sessionId: 's1' });
    mockSelectChain(mockSelect, [activeUser]);
    mockGetUserPermissions.mockResolvedValue(new Set(['read:users']));

    const req = createMockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      ...activeUser,
      permissions: ['read:users'],
    });
  });

  it('calls next() without error when token is invalid', async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const req = createMockRequest({ headers: { authorization: 'Bearer bad-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });
});
