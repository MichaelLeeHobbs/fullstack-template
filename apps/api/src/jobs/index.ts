// ===========================================
// Job Registration & Enqueue Helper
// ===========================================
// Registers all job handlers and provides type-safe enqueue().

import type { PgBoss } from 'pg-boss';
import { getBoss } from '../lib/queue.js';
import { registerEmailHandlers, EMAIL_QUEUES } from './email.js';
import { registerCleanupHandler } from './cleanup.js';
import { registerNotificationHandler, NOTIFICATION_QUEUES } from './notification.js';
import { registerCertExpirationHandler } from './cert-expiration.js';
import type { SendVerificationEmailPayload, SendPasswordResetEmailPayload } from './email.js';
import type { SendNotificationPayload } from './notification.js';

interface JobMap {
  [EMAIL_QUEUES.VERIFICATION]: SendVerificationEmailPayload;
  [EMAIL_QUEUES.PASSWORD_RESET]: SendPasswordResetEmailPayload;
  [NOTIFICATION_QUEUES.SEND]: SendNotificationPayload;
}

export async function registerAllHandlers(boss: PgBoss): Promise<void> {
  await registerEmailHandlers(boss);
  await registerCleanupHandler(boss);
  await registerNotificationHandler(boss);
  await registerCertExpirationHandler(boss);
}

/**
 * Type-safe enqueue. Falls back to direct execution when
 * pgboss is not running (test environment).
 */
export async function enqueue<K extends keyof JobMap>(name: K, data: JobMap[K]): Promise<void> {
  const boss = getBoss();
  if (boss) {
    await boss.send(name, data as object);
  } else {
    if (name === EMAIL_QUEUES.VERIFICATION) {
      const { EmailService } = await import('../services/email.service.js');
      const payload = data as SendVerificationEmailPayload;
      await EmailService.sendVerificationEmail(payload.email, payload.token);
    } else if (name === EMAIL_QUEUES.PASSWORD_RESET) {
      const { EmailService } = await import('../services/email.service.js');
      const payload = data as SendPasswordResetEmailPayload;
      await EmailService.sendPasswordResetEmail(payload.email, payload.token);
    } else if (name === NOTIFICATION_QUEUES.SEND) {
      const { NotificationService } = await import('../services/notification.service.js');
      const payload = data as SendNotificationPayload;
      await NotificationService.create(payload);
    }
  }
}

export { EMAIL_QUEUES } from './email.js';
export { NOTIFICATION_QUEUES } from './notification.js';
