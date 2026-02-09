// ===========================================
// Maintenance Mode Middleware
// ===========================================
// Blocks non-admin access when maintenance mode is enabled.
// Performs a lightweight JWT check to identify admin users.

import type { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { db } from '../lib/db.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export async function maintenanceMode(req: Request, res: Response, next: NextFunction): Promise<void> {
  const isMaintenanceMode = await SettingsService.get<boolean>('app.maintenance_mode', false);

  if (!isMaintenanceMode) {
    return next();
  }

  // Check if user is admin via JWT (lightweight check)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      const [user] = await db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, payload.userId));
      if (user?.isAdmin) {
        return next();
      }
    } catch {
      // Invalid token — fall through to 503
    }
  }

  res.status(503).json({
    success: false,
    error: 'Service is under maintenance. Please try again later.',
  });
}
