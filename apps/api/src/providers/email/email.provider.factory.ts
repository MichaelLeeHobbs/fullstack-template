// ===========================================
// Email Provider Factory
// ===========================================
// Creates the appropriate email provider based on configuration.
// Falls back to mock provider if config is incomplete.

import { config } from '../../config/index.js';
import logger from '../../lib/logger.js';
import { type EmailProvider, EmailProviderType } from './email.provider.interface.js';
import { MockEmailProvider } from './mock.email.provider.js';
import { SmtpEmailProvider } from './smtp.email.provider.js';
import { SesEmailProvider } from './ses.email.provider.js';

// ===========================================
// Singleton Cache
// ===========================================

let cachedProvider: EmailProvider | null = null;

// ===========================================
// Validation Helpers
// ===========================================

function validateSmtpConfig(): boolean {
  return !!(
    config.SMTP_HOST &&
    config.SMTP_PORT &&
    config.SMTP_USER &&
    config.SMTP_PASS &&
    config.EMAIL_FROM
  );
}

function validateSesConfig(): boolean {
  return !!(
    config.AWS_SES_REGION &&
    config.AWS_ACCESS_KEY_ID &&
    config.AWS_SECRET_ACCESS_KEY &&
    config.EMAIL_FROM
  );
}

// ===========================================
// Factory
// ===========================================

/**
 * Get the configured email provider.
 * Uses lazy initialization with singleton caching.
 * Falls back to mock provider if requested provider is not properly configured.
 */
export function getEmailProvider(): EmailProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const requestedProvider = config.EMAIL_PROVIDER;

  switch (requestedProvider) {
    case EmailProviderType.SMTP:
      if (validateSmtpConfig()) {
        cachedProvider = new SmtpEmailProvider({
          host: config.SMTP_HOST!,
          port: config.SMTP_PORT!,
          user: config.SMTP_USER!,
          pass: config.SMTP_PASS!,
          secure: config.SMTP_SECURE,
          from: config.EMAIL_FROM!,
        });
        logger.info({ provider: 'smtp', host: config.SMTP_HOST },'Email provider initialized');
      } else {
        logger.warn({
          hasHost: !!config.SMTP_HOST,
          hasPort: !!config.SMTP_PORT,
          hasUser: !!config.SMTP_USER,
          hasPass: !!config.SMTP_PASS,
          hasFrom: !!config.EMAIL_FROM,
        }, 'SMTP configuration incomplete, falling back to mock provider');
        cachedProvider = new MockEmailProvider();
      }
      break;

    case EmailProviderType.SES:
      if (validateSesConfig()) {
        cachedProvider = new SesEmailProvider({
          region: config.AWS_SES_REGION!,
          accessKeyId: config.AWS_ACCESS_KEY_ID!,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
          from: config.EMAIL_FROM!,
        });
        logger.info({ provider: 'ses', region: config.AWS_SES_REGION }, 'Email provider initialized');
      } else {
        logger.warn({
          hasRegion: !!config.AWS_SES_REGION,
          hasAccessKey: !!config.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!config.AWS_SECRET_ACCESS_KEY,
          hasFrom: !!config.EMAIL_FROM,
        }, 'SES configuration incomplete, falling back to mock provider');
        cachedProvider = new MockEmailProvider();
      }
      break;

    case EmailProviderType.Mock:
    default:
      cachedProvider = new MockEmailProvider();
      logger.info({ provider: 'mock' }, 'Email provider initialized');
      break;
  }

  return cachedProvider;
}

/**
 * Reset cached provider (useful for testing).
 */
export function resetEmailProvider(): void {
  cachedProvider = null;
}
