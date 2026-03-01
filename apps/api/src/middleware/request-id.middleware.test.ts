// ===========================================
// Request ID Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRandomUUID } = vi.hoisted(() => {
  return { mockRandomUUID: vi.fn().mockReturnValue('mock-uuid-1234') };
});

vi.mock('crypto', () => ({
  randomUUID: mockRandomUUID,
}));

import { requestId } from './request-id.middleware.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../test/utils/index.js';

describe('requestId middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomUUID.mockReturnValue('mock-uuid-1234');
  });

  it('generates a UUID when no X-Request-ID header present', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    requestId(req, res, next);

    expect(req.id).toBe('mock-uuid-1234');
  });

  it('uses existing X-Request-ID header when present', () => {
    const req = createMockRequest({ headers: { 'x-request-id': 'existing-id-abc' } });
    const res = createMockResponse();
    const next = createMockNext();

    requestId(req, res, next);

    expect(req.id).toBe('existing-id-abc');
  });

  it('sets X-Request-ID response header', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    requestId(req, res, next);

    expect((res as any)._headers['X-Request-ID']).toBe('mock-uuid-1234');
  });

  it('sets X-Request-ID response header with existing header value', () => {
    const req = createMockRequest({ headers: { 'x-request-id': 'existing-id-abc' } });
    const res = createMockResponse();
    const next = createMockNext();

    requestId(req, res, next);

    expect((res as any)._headers['X-Request-ID']).toBe('existing-id-abc');
  });

  it('calls next()', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = createMockNext();

    requestId(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
