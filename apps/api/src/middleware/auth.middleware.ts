// ===========================================
// Auth Middleware
// ===========================================
// Verifies JWT tokens and attaches user info to request.

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { db } from '../lib/db.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger.js';
import { PermissionService } from '../services/permission.service.js';
import { ApiKeyService } from '../services/api-key.service.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id: string;
        email: string;
        isAdmin: boolean;
        isActive: boolean;
        emailVerified: boolean;
        permissions: string[];
      };
      apiKeyId?: string;
      sessionId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Check for API key first
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  if (apiKeyHeader) {
    return authenticateApiKey(apiKeyHeader, req, res, next);
  }

  // Fall through to JWT Bearer
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Fetch user from database to get current status
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, payload.userId));

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, error: 'Account is deactivated' });
      return;
    }

    // Fetch user permissions (cached)
    const permissions = await PermissionService.getUserPermissions(user.id);

    req.user = {
      ...user,
      permissions: Array.from(permissions),
    };
    req.sessionId = payload.sessionId;
    next();
  } catch (error) {
    logger.debug({ error },'Token verification failed');
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * Authenticate via X-API-Key header
 */
async function authenticateApiKey(
  rawKey: string,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const result = await ApiKeyService.validateKey(rawKey);

  if (!result.ok) {
    logger.debug({ error: result.error.message }, 'API key validation failed');
    res.status(401).json({ success: false, error: 'Invalid or expired API key' });
    return;
  }

  const { apiKey, userId, permissions } = result.value;

  // Fetch owning user to check isActive
  const [owner] = await db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
      isActive: users.isActive,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!owner) {
    res.status(401).json({ success: false, error: 'API key owner not found' });
    return;
  }

  if (!owner.isActive) {
    res.status(403).json({ success: false, error: 'API key owner account is deactivated' });
    return;
  }

  // Use key's own permissions (not the user's role-based permissions)
  req.user = {
    ...owner,
    permissions: Array.from(permissions),
  };
  req.apiKeyId = apiKey.id;
  next();
}

// Optional auth - attaches user if token present but doesn't require it
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Check for API key first
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  if (apiKeyHeader) {
    try {
      const result = await ApiKeyService.validateKey(apiKeyHeader);
      if (result.ok) {
        const { apiKey, userId, permissions } = result.value;
        const [owner] = await db
          .select({
            id: users.id,
            email: users.email,
            isAdmin: users.isAdmin,
            isActive: users.isActive,
            emailVerified: users.emailVerified,
          })
          .from(users)
          .where(eq(users.id, userId));

        if (owner && owner.isActive) {
          req.user = {
            ...owner,
            permissions: Array.from(permissions),
          };
          req.apiKeyId = apiKey.id;
        }
      }
    } catch {
      // Ignore invalid API keys for optional auth
    }
    return void next();
  }

  // Fall through to JWT Bearer
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, payload.userId));

    if (user && user.isActive) {
      // Fetch user permissions (cached)
      const permissions = await PermissionService.getUserPermissions(user.id);

      req.user = {
        ...user,
        permissions: Array.from(permissions),
      };
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }

  next();
}
