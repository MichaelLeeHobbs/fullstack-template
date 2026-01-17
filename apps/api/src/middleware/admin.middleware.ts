// ===========================================
// Admin Middleware
// ===========================================
// Restricts access to admin-only routes.
// Requires authenticate middleware to run first.

import type { Request, Response, NextFunction } from 'express';

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Must be used after authenticate middleware
  if (!req.user?.id) {
    return void res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  // authenticate middleware now fetches full user including isAdmin
  if (!req.user.isAdmin) {
    return void res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  next();
}

