// ===========================================
// Mock Email Provider
// ===========================================
// Logs emails to console for development/testing.

import { tryCatch, type Result } from 'stderr-lib';
import logger from '../../lib/logger.js';
import {
  type EmailProvider,
  type EmailOptions,
  type EmailResult,
  EmailProviderType,
} from './email.provider.interface.js';

export class MockEmailProvider implements EmailProvider {
  readonly type = EmailProviderType.Mock;

  async send(options: EmailOptions): Promise<Result<EmailResult>> {
    return tryCatch(async () => {
      const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      logger.info({
        messageId,
        to: options.to,
        subject: options.subject,
      }, 'MOCK EMAIL SENT');

      // Log full content at debug level for testing
      logger.debug({
        text: options.text?.substring(0, 200),
        htmlPreview: options.html?.substring(0, 300),
      }, 'Email content');

      return { messageId, provider: this.type };
    });
  }

  async testConnection(): Promise<Result<boolean>> {
    return tryCatch(async () => {
      logger.info('Mock email provider connection test: OK');
      return true;
    });
  }
}
