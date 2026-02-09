// ===========================================
// Expired Data Cleanup Job
// ===========================================
// Deletes expired sessions, verification tokens, and password reset tokens.

import type { PgBoss } from 'pg-boss';
import { lt } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { sessions, emailVerificationTokens, passwordResetTokens } from '../db/schema/index.js';
import { NotificationService } from '../services/notification.service.js';
import logger from '../lib/logger.js';

export async function cleanupExpiredData(): Promise<void> {
  const now = new Date();

  try {
    const deletedSessions = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now))
      .returning({ id: sessions.id });

    const deletedVerificationTokens = await db
      .delete(emailVerificationTokens)
      .where(lt(emailVerificationTokens.expiresAt, now))
      .returning({ id: emailVerificationTokens.id });

    const deletedResetTokens = await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, now))
      .returning({ id: passwordResetTokens.id });

    const deletedNotifications = await NotificationService.deleteOlderThan(90);

    logger.info(
      {
        sessions: deletedSessions.length,
        verificationTokens: deletedVerificationTokens.length,
        resetTokens: deletedResetTokens.length,
        notifications: deletedNotifications,
      },
      'Expired data cleanup completed',
    );
  } catch (error) {
    logger.error({ error }, 'Expired data cleanup failed');
  }
}

export async function registerCleanupHandler(boss: PgBoss): Promise<void> {
  await boss.createQueue('maintenance.cleanup', { retryLimit: 1 });

  boss.work('maintenance.cleanup', async (_jobs) => {
    await cleanupExpiredData();
  });

  await boss.schedule('maintenance.cleanup', '0 * * * *');
}
