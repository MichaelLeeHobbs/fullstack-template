// ===========================================
// Notification Job Handler
// ===========================================
// Async notification delivery via pgboss.

import type { PgBoss, Job } from 'pg-boss';
import { NotificationService, type CreateNotificationInput } from '../services/notification.service.js';
import logger from '../lib/logger.js';

export type SendNotificationPayload = CreateNotificationInput;

export const NOTIFICATION_QUEUES = {
  SEND: 'notification.send',
} as const;

export async function registerNotificationHandler(boss: PgBoss): Promise<void> {
  await boss.createQueue(NOTIFICATION_QUEUES.SEND, {
    retryLimit: 3,
    retryDelay: 5,
    expireInSeconds: 300,
  });

  boss.work<SendNotificationPayload>(NOTIFICATION_QUEUES.SEND, async (jobs: Job<SendNotificationPayload>[]) => {
    for (const job of jobs) {
      const result = await NotificationService.create(job.data);
      if (!result.ok) {
        logger.error({ error: result.error.message }, 'Notification delivery failed');
        throw result.error;
      }
      logger.debug({ userId: job.data.userId }, 'Notification delivered via queue');
    }
  });
}
