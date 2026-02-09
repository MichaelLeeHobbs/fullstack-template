// ===========================================
// Socket.IO Auth Middleware
// ===========================================
// Verifies JWT from socket handshake and attaches user data.

import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt.js';
import { db } from '../lib/db.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger.js';

export interface SocketUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyAccessToken(token);

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.userId));

    if (!user) {
      return next(new Error('Authentication required'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication required'));
    }

    socket.data.user = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    } satisfies SocketUser;

    next();
  } catch (error) {
    logger.debug({ error }, 'Socket authentication failed');
    next(new Error('Authentication required'));
  }
}
