// ===========================================
// Cache Middleware
// ===========================================
// HTTP caching header middleware for GET endpoints.

import type { RequestHandler } from 'express';

interface CacheOptions {
  maxAge?: number;
  private?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
}

export function cacheControl(options: CacheOptions): RequestHandler {
  const directives: string[] = [];

  if (options.noStore) {
    directives.push('no-store', 'no-cache');
  } else {
    directives.push(options.private !== false ? 'private' : 'public');
    if (options.mustRevalidate) directives.push('must-revalidate');
    directives.push(`max-age=${options.maxAge ?? 0}`);
  }

  const header = directives.join(', ');

  return (_req, res, next) => {
    res.set('Cache-Control', header);
    next();
  };
}

export function noCache(): RequestHandler {
  return cacheControl({ noStore: true });
}
