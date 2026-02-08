// ===========================================
// AWS SES Email Provider
// ===========================================
// Uses AWS SES to send emails.

import { tryCatch, type Result } from 'stderr-lib';
import type { SESClient as SESClientType } from '@aws-sdk/client-ses';
import logger from '../../lib/logger.js';
import {
  type EmailProvider,
  type EmailOptions,
  type EmailResult,
  EmailProviderType,
} from './email.provider.interface.js';

// ===========================================
// Types
// ===========================================

export interface SesConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  from: string;
}

// ===========================================
// Provider
// ===========================================

export class SesEmailProvider implements EmailProvider {
  readonly type = EmailProviderType.SES;
  private client: SESClientType | null = null;
  private readonly config: SesConfig;

  constructor(config: SesConfig) {
    this.config = config;
  }

  private async getClient(): Promise<SESClientType> {
    if (!this.client) {
      const { SESClient } = await import('@aws-sdk/client-ses');
      this.client = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  async send(options: EmailOptions): Promise<Result<EmailResult>> {
    return tryCatch(async () => {
      const { SendEmailCommand } = await import('@aws-sdk/client-ses');
      const client = await this.getClient();

      const command = new SendEmailCommand({
        Source: options.from ?? this.config.from,
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject, Charset: 'UTF-8' },
          Body: {
            Text: options.text ? { Data: options.text, Charset: 'UTF-8' } : undefined,
            Html: options.html ? { Data: options.html, Charset: 'UTF-8' } : undefined,
          },
        },
      });

      const response = await client.send(command);

      logger.info({
        messageId: response.MessageId,
        to: options.to,
        subject: options.subject,
      }, 'SES email sent');

      return {
        messageId: response.MessageId ?? `ses-${Date.now()}`,
        provider: this.type,
      };
    });
  }

  async testConnection(): Promise<Result<boolean>> {
    return tryCatch(async () => {
      const { GetIdentityVerificationAttributesCommand } = await import('@aws-sdk/client-ses');
      const client = await this.getClient();
      // Test connection by checking the verification status of the from address
      await client.send(
        new GetIdentityVerificationAttributesCommand({
          Identities: [this.config.from],
        })
      );
      logger.info('SES email provider connection test: OK');
      return true;
    });
  }
}
