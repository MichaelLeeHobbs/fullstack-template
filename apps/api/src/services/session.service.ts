// ===========================================
// Session Service
// ===========================================
// Manages active sessions for a user.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import { sessions } from '../db/schema/index.js';
import { eq, and, ne, gt } from 'drizzle-orm';

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  isCurrent: boolean;
}

export class SessionService {
  static async getActiveSessions(userId: string, currentSessionId?: string): Promise<Result<SessionInfo[]>> {
    return tryCatch(async () => {
      const rows = await db
        .select({
          id: sessions.id,
          userAgent: sessions.userAgent,
          ipAddress: sessions.ipAddress,
          lastUsedAt: sessions.lastUsedAt,
          createdAt: sessions.createdAt,
        })
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          gt(sessions.expiresAt, new Date()),
        ));

      return rows.map((row) => ({
        ...row,
        isCurrent: row.id === currentSessionId,
      }));
    });
  }

  static async revokeSession(userId: string, sessionId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const result = await db
        .delete(sessions)
        .where(and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
        ))
        .returning({ id: sessions.id });

      if (result.length === 0) {
        throw new ServiceError('NOT_FOUND', 'Session not found');
      }
    });
  }

  static async revokeAllUserSessions(userId: string): Promise<Result<{ revokedCount: number }>> {
    return tryCatch(async () => {
      const result = await db
        .delete(sessions)
        .where(eq(sessions.userId, userId))
        .returning({ id: sessions.id });

      return { revokedCount: result.length };
    });
  }

  static async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<Result<{ revokedCount: number }>> {
    return tryCatch(async () => {
      const result = await db
        .delete(sessions)
        .where(and(
          eq(sessions.userId, userId),
          ne(sessions.id, currentSessionId),
        ))
        .returning({ id: sessions.id });

      return { revokedCount: result.length };
    });
  }
}
