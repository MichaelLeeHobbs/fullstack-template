// ===========================================
// Socket Auth Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Module mocks (hoisted) ----

const { mockVerifyAccessToken, mockSelect } = vi.hoisted(() => {
  return {
    mockVerifyAccessToken: vi.fn(),
    mockSelect: vi.fn(),
  };
});

vi.mock('../lib/jwt.js', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

vi.mock('../lib/db.js', () => ({
  db: { select: mockSelect },
}));

vi.mock('../db/schema/index.js', () => ({ users: {} }));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { socketAuthMiddleware } from './socket-auth.middleware.js';
import { mockSelectChain } from '../../test/utils/index.js';

// ---- Helpers ----

function createMockSocket(token?: string) {
  return {
    handshake: { auth: { token } },
    data: {} as Record<string, unknown>,
  };
}

describe('socketAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next with error when no token is provided', async () => {
    const socket = createMockSocket();
    const next = vi.fn();

    await socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Authentication required');
  });

  it('calls next with error when JWT verification fails', async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const socket = createMockSocket('bad-token');
    const next = vi.fn();

    await socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Authentication required');
  });

  it('calls next with error when user not found', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'missing-user' });
    mockSelectChain(mockSelect, []);

    const socket = createMockSocket('valid-token');
    const next = vi.fn();

    await socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Authentication required');
  });

  it('calls next with error when user is not active', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'user-1' });
    mockSelectChain(mockSelect, [
      { id: 'user-1', email: 'test@example.com', isAdmin: false, isActive: false },
    ]);

    const socket = createMockSocket('valid-token');
    const next = vi.fn();

    await socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Authentication required');
  });

  it('sets socket.data.user and calls next() when valid token and active user', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'user-1' });
    mockSelectChain(mockSelect, [
      { id: 'user-1', email: 'test@example.com', isAdmin: false, isActive: true },
    ]);

    const socket = createMockSocket('valid-token');
    const next = vi.fn();

    await socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      isAdmin: false,
    });
  });

  it('sets isAdmin correctly for admin users', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'admin-1' });
    mockSelectChain(mockSelect, [
      { id: 'admin-1', email: 'admin@example.com', isAdmin: true, isActive: true },
    ]);

    const socket = createMockSocket('admin-token');
    const next = vi.fn();

    await socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({
      id: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });
  });
});
