// ===========================================
// Permission Middleware
// ===========================================
// Middleware for checking user permissions on routes.

import type { NextFunction, Request, Response } from 'express';
import { PermissionService } from '../services/permission.service.js';
import logger from '../lib/logger.js';

/**
 * Require user to have at least one of the specified permissions
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const hasPermission = await PermissionService.userHasAnyPermission(req.user.id, permissions);

      if (!hasPermission) {
        logger.debug(
          {
            userId: req.user.id,
            required: permissions,
            path: req.path,
          },
          'Permission denied'
        );
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Permission check failed');
      res.status(500).json({ success: false, error: 'Permission check failed' });
    }
  };
}

/**
 * Require user to have all of the specified permissions
 */
export function requireAllPermissions(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const hasAllPermissions = await PermissionService.userHasAllPermissions(
        req.user.id,
        permissions
      );

      if (!hasAllPermissions) {
        logger.debug(
          {
            userId: req.user.id,
            required: permissions,
            path: req.path,
          },
          'Permission denied (all required)'
        );
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Permission check failed');
      res.status(500).json({ success: false, error: 'Permission check failed' });
    }
  };
}

/**
 * Check if user has permission (for conditional logic in controllers)
 * Attaches result to req.hasPermission
 */
export function checkPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      (req as Request & { hasPermission: boolean }).hasPermission = false;
      next();
      return;
    }

    try {
      (req as Request & { hasPermission: boolean }).hasPermission =
        await PermissionService.userHasPermission(req.user.id, permission);
      next();
    } catch (error) {
      logger.error({ error }, 'Permission check failed');
      (req as Request & { hasPermission: boolean }).hasPermission = false;
      next();
    }
  };
}
