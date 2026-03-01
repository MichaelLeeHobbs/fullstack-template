// ===========================================
// Maintenance Mode Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Module mocks (hoisted) ----

const { mockSettingsGet, mockVerifyAccessToken, mockSelect } = vi.hoisted(() => {
  return {
    mockSettingsGet: vi.fn(),
    mockVerifyAccessToken: vi.fn(),
    mockSelect: vi.fn(),
  };
});

vi.mock('../services/settings.service.js', () => ({
  SettingsService: { get: mockSettingsGet },
}));

vi.mock('../lib/jwt.js', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

vi.mock('../lib/db.js', () => ({
  db: { select: mockSelect },
}));

vi.mock('../db/schema/index.js', () => ({ users: {} }));

import { maintenanceMode } from './maintenance.middleware.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  mockSelectChain,
} from '../../test/utils/index.js';

describe('maintenanceMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() when maintenance mode is OFF', async () => {
    mockSettingsGet.mockResolvedValue(false);

    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    await maintenanceMode(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 503 when maintenance mode is ON and no auth header', async () => {
    mockSettingsGet.mockResolvedValue(true);

    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    await maintenanceMode(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res._json).toEqual({
      success: false,
      error: 'Service is under maintenance. Please try again later.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 503 when maintenance mode is ON and user is not admin', async () => {
    mockSettingsGet.mockResolvedValue(true);
    mockVerifyAccessToken.mockReturnValue({ userId: 'user-1' });
    mockSelectChain(mockSelect, [{ isAdmin: false }]);

    const req = createMockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await maintenanceMode(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res._json).toEqual({
      success: false,
      error: 'Service is under maintenance. Please try again later.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when maintenance mode is ON but user IS admin', async () => {
    mockSettingsGet.mockResolvedValue(true);
    mockVerifyAccessToken.mockReturnValue({ userId: 'admin-1' });
    mockSelectChain(mockSelect, [{ isAdmin: true }]);

    const req = createMockRequest({ headers: { authorization: 'Bearer admin-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await maintenanceMode(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 503 when maintenance mode is ON and token verification fails', async () => {
    mockSettingsGet.mockResolvedValue(true);
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const req = createMockRequest({ headers: { authorization: 'Bearer bad-token' } });
    const res = createMockResponse();
    const next = createMockNext();

    await maintenanceMode(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res._json).toEqual({
      success: false,
      error: 'Service is under maintenance. Please try again later.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
