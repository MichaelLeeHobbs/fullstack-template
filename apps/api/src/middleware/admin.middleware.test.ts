// ===========================================
// Admin Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { requireAdmin } from './admin.middleware.js';

describe('requireAdmin middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('should return 401 if user is not authenticated', () => {
    const req = {} as Request;
    const res = createMockResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Unauthorized',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not admin', () => {
    const req = {
      user: { id: 'user-123', email: 'test@test.com', isAdmin: false, isActive: true, emailVerified: true },
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Admin access required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() if user is admin', () => {
    const req = {
      user: { id: 'user-123', email: 'admin@test.com', isAdmin: true, isActive: true, emailVerified: true },
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
