// ===========================================
// Express Mock Helpers
// ===========================================
// Provides mock Request, Response, and NextFunction for controller tests.

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

interface MockRequestOverrides {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  ip?: string;
  user?: { id: string; email?: string; isAdmin?: boolean };
  sessionId?: string;
}

export function createMockRequest(overrides: MockRequestOverrides = {}): Request {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request;
}

export function createMockResponse() {
  const res = {
    _status: 200,
    _json: null as unknown,
    _headers: {} as Record<string, string>,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      return res;
    },
    setHeader(name: string, value: string) {
      res._headers[name] = value;
      return res;
    },
  };

  // Spy on methods so tests can use expect().toHaveBeenCalled()
  vi.spyOn(res, 'status');
  vi.spyOn(res, 'json');

  return res as unknown as Response & { _status: number; _json: unknown; _headers: Record<string, string> };
}

export function createMockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}
