// ===========================================
// Job Registration & Enqueue Helper
// ===========================================
// Registers all job handlers and provides type-safe enqueue().

import type { PgBoss } from 'pg-boss';
import { getBoss } from '../lib/queue.js';
import { registerEmailHandlers, EMAIL_QUEUES } from './email.js';
import { registerCleanupHandler } from './cleanup.js';
import type { SendVerificationEmailPayload, SendPasswordResetEmailPayload } from './email.js';

interface JobMap {
  [EMAIL_QUEUES.VERIFICATION]: SendVerificationEmailPayload;
  [EMAIL_QUEUES.PASSWORD_RESET]: SendPasswordResetEmailPayload;
}

export async function registerAllHandlers(boss: PgBoss): Promise<void> {
  await registerEmailHandlers(boss);
  await registerCleanupHandler(boss);
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
    const { EmailService } = await import('../services/email.service.js');
    if (name === EMAIL_QUEUES.VERIFICATION) {
      const payload = data as SendVerificationEmailPayload;
      await EmailService.sendVerificationEmail(payload.email, payload.token);
    } else if (name === EMAIL_QUEUES.PASSWORD_RESET) {
      const payload = data as SendPasswordResetEmailPayload;
      await EmailService.sendPasswordResetEmail(payload.email, payload.token);
    }
  }
}

export { EMAIL_QUEUES } from './email.js';
