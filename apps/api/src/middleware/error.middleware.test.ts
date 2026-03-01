// ===========================================
// Error Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Module mocks (hoisted) ----

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = { NODE_ENV: 'development' } as Record<string, string>;
  return { mockConfig };
});

vi.mock('../lib/logger.js', () => ({
  default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../config/index.js', () => ({
  config: mockConfig,
}));

vi.mock('../lib/sentry.js', () => ({
  Sentry: { withScope: vi.fn(), captureException: vi.fn() },
  sentryEnabled: false,
}));

import { errorHandler, notFoundHandler } from './error.middleware.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../test/utils/index.js';

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.NODE_ENV = 'development';
  });

  it('returns 500 with error message in development', () => {
    const err = new Error('Something broke');
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res._json).toEqual({
      success: false,
      error: 'Something broke',
    });
  });

  it('returns 500 with generic message in production', () => {
    mockConfig.NODE_ENV = 'production';

    const err = new Error('Sensitive database error');
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res._json).toEqual({
      success: false,
      error: 'Internal server error',
    });
  });

  it('handles non-Error objects gracefully', () => {
    const err = 'string error';
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res._json).toHaveProperty('success', false);
  });
});

describe('notFoundHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 with method and path in error message', () => {
    const req = createMockRequest({ headers: {} });
    Object.assign(req, { method: 'GET', path: '/api/nonexistent' });
    const res = createMockResponse();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res._json).toEqual({
      success: false,
      error: 'Route GET /api/nonexistent not found',
    });
  });

  it('includes POST method in error message', () => {
    const req = createMockRequest({ headers: {} });
    Object.assign(req, { method: 'POST', path: '/api/missing' });
    const res = createMockResponse();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res._json).toEqual({
      success: false,
      error: 'Route POST /api/missing not found',
    });
  });
});
