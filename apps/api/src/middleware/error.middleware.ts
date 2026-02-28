// ===========================================
// Error Handling Middleware
// ===========================================
// Global error handler for Express.

import type { NextFunction, Request, Response } from 'express';
import { stderr } from 'stderr-lib';
import logger from '../lib/logger.js';
import { config } from '../config/index.js';
import { Sentry, sentryEnabled } from '../lib/sentry.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const error = stderr(err);

  logger.error({ error, path: req.path, method: req.method }, 'Unhandled error');

  if (sentryEnabled) {
    Sentry.withScope((scope) => {
      scope.setTag('requestId', String(req.id ?? 'unknown'));
      if (req.user) scope.setUser({ id: req.user.id, email: req.user.email });
      scope.setExtras({ path: req.path, method: req.method });
      Sentry.captureException(error);
    });
  }

  // Don't leak error details in production
  const message = config.NODE_ENV === 'production' ? 'Internal server error' : error.message;

  res.status(500).json({ success: false, error: message });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
}
