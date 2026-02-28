// ===========================================
// SSL Header Stripping Middleware
// ===========================================
// Strips x-ssl-* headers from non-trusted-proxy requests to prevent spoofing.
// Only requests from the configured TRUSTED_PROXY_IP are allowed to set these headers.

import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

const SSL_HEADERS = [
  'x-ssl-authenticated',
  'x-ssl-user-dn',
  'x-ssl-cn',
  'x-ssl-serial',
  'x-ssl-expiration',
  'x-ssl-fingerprint',
];

export function stripSslHeaders(req: Request, _res: Response, next: NextFunction): void {
  // If no trusted proxy IP is configured, strip all SSL headers
  // If configured, only allow from the trusted proxy
  const trustedIp = config.TRUSTED_PROXY_IP;

  if (!trustedIp || req.ip !== trustedIp) {
    for (const header of SSL_HEADERS) {
      delete req.headers[header];
    }
  }

  next();
}
