// ===========================================
// Email Job Handlers
// ===========================================
// Defines email job types and their pgboss worker functions.

import type { PgBoss, Job } from 'pg-boss';
import { EmailService } from '../services/email.service.js';
import logger from '../lib/logger.js';

export interface SendVerificationEmailPayload {
  email: string;
  token: string;
}

export interface SendPasswordResetEmailPayload {
  email: string;
  token: string;
}

export const EMAIL_QUEUES = {
  VERIFICATION: 'email.verification',
  PASSWORD_RESET: 'email.password-reset',
} as const;

export async function registerEmailHandlers(boss: PgBoss): Promise<void> {
  await boss.createQueue(EMAIL_QUEUES.VERIFICATION, {
    retryLimit: 3,
    retryDelay: 30,
    expireInSeconds: 60 * 60,
  });
  await boss.createQueue(EMAIL_QUEUES.PASSWORD_RESET, {
    retryLimit: 3,
    retryDelay: 30,
    expireInSeconds: 60 * 60,
  });

  boss.work<SendVerificationEmailPayload>(EMAIL_QUEUES.VERIFICATION, async (jobs: Job<SendVerificationEmailPayload>[]) => {
    for (const job of jobs) {
      const { email, token } = job.data;
      const result = await EmailService.sendVerificationEmail(email, token);
      if (!result.ok) {
        logger.error({ email, error: result.error.message }, 'Verification email failed');
        throw result.error;
      }
      logger.info({ email }, 'Verification email sent via queue');
    }
  });

  boss.work<SendPasswordResetEmailPayload>(EMAIL_QUEUES.PASSWORD_RESET, async (jobs: Job<SendPasswordResetEmailPayload>[]) => {
    for (const job of jobs) {
      const { email, token } = job.data;
      const result = await EmailService.sendPasswordResetEmail(email, token);
      if (!result.ok) {
        logger.error({ email, error: result.error.message }, 'Password reset email failed');
        throw result.error;
      }
      logger.info({ email }, 'Password reset email sent via queue');
    }
  });
}
