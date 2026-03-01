// ===========================================
// Cache Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheControl, noCache } from './cache.middleware.js';

describe('cacheControl', () => {
  const createRes = () => ({ set: vi.fn() });
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('sets private, max-age=300 for maxAge option', () => {
    const res = createRes();
    const middleware = cacheControl({ maxAge: 300 });

    middleware({} as any, res as any, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=300');
    expect(next).toHaveBeenCalled();
  });

  it('sets no-store, no-cache for noStore option', () => {
    const res = createRes();
    const middleware = cacheControl({ noStore: true });

    middleware({} as any, res as any, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(next).toHaveBeenCalled();
  });

  it('sets public, max-age=3600 when private is false', () => {
    const res = createRes();
    const middleware = cacheControl({ private: false, maxAge: 3600 });

    middleware({} as any, res as any, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
    expect(next).toHaveBeenCalled();
  });

  it('sets private, must-revalidate, max-age=0 with mustRevalidate', () => {
    const res = createRes();
    const middleware = cacheControl({ mustRevalidate: true, maxAge: 0 });

    middleware({} as any, res as any, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, must-revalidate, max-age=0');
    expect(next).toHaveBeenCalled();
  });

  it('defaults to private, max-age=0 with no options', () => {
    const res = createRes();
    const middleware = cacheControl({});

    middleware({} as any, res as any, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=0');
    expect(next).toHaveBeenCalled();
  });
});

describe('noCache', () => {
  it('sets no-store, no-cache and calls next', () => {
    const res = { set: vi.fn() };
    const next = vi.fn();
    const middleware = noCache();

    middleware({} as any, res as any, next);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(next).toHaveBeenCalled();
  });
});
