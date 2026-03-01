// ===========================================
// SSL Header Stripping Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = { TRUSTED_PROXY_IP: undefined } as Record<string, unknown>;
  return { mockConfig };
});

vi.mock('../config/index.js', () => ({
  config: mockConfig,
}));

import { stripSslHeaders } from './ssl-header.middleware.js';
import { createMockRequest, createMockNext } from '../../test/utils/index.js';
import type { Response } from 'express';

const SSL_HEADERS = [
  'x-ssl-authenticated',
  'x-ssl-user-dn',
  'x-ssl-cn',
  'x-ssl-serial',
  'x-ssl-expiration',
  'x-ssl-fingerprint',
];

function createReqWithSslHeaders(ip: string) {
  const sslHeaders: Record<string, string> = {};
  for (const h of SSL_HEADERS) {
    sslHeaders[h] = 'test-value';
  }
  return createMockRequest({ headers: sslHeaders, ip });
}

describe('stripSslHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.TRUSTED_PROXY_IP = undefined;
  });

  it('strips all SSL headers when no trusted proxy configured', () => {
    const req = createReqWithSslHeaders('10.0.0.1');
    const next = createMockNext();

    stripSslHeaders(req, {} as Response, next);

    for (const header of SSL_HEADERS) {
      expect(req.headers[header]).toBeUndefined();
    }
    expect(next).toHaveBeenCalled();
  });

  it('strips SSL headers when request IP does not match trusted proxy', () => {
    mockConfig.TRUSTED_PROXY_IP = '192.168.1.100';

    const req = createReqWithSslHeaders('10.0.0.1');
    const next = createMockNext();

    stripSslHeaders(req, {} as Response, next);

    for (const header of SSL_HEADERS) {
      expect(req.headers[header]).toBeUndefined();
    }
    expect(next).toHaveBeenCalled();
  });

  it('preserves SSL headers when request IP matches trusted proxy', () => {
    mockConfig.TRUSTED_PROXY_IP = '192.168.1.100';

    const req = createReqWithSslHeaders('192.168.1.100');
    const next = createMockNext();

    stripSslHeaders(req, {} as Response, next);

    for (const header of SSL_HEADERS) {
      expect(req.headers[header]).toBe('test-value');
    }
    expect(next).toHaveBeenCalled();
  });

  it('calls next() in all cases', () => {
    const req = createMockRequest({ headers: {} });
    const next = createMockNext();

    stripSslHeaders(req, {} as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
