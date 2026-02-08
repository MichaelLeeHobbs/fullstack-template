// ===========================================
// SMTP Email Provider
// ===========================================
// Uses nodemailer to send emails via SMTP.

import { tryCatch, type Result } from 'stderr-lib';
import type { Transporter } from 'nodemailer';
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

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
}

// ===========================================
// Provider
// ===========================================

export class SmtpEmailProvider implements EmailProvider {
  readonly type = EmailProviderType.SMTP;
  private transporter: Transporter | null = null;
  private readonly config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  private async getTransporter(): Promise<Transporter> {
    if (!this.transporter) {
      // Dynamic import to avoid loading nodemailer if not used
      const { createTransport } = await import('nodemailer');
      this.transporter = createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      });
    }
    return this.transporter;
  }

  async send(options: EmailOptions): Promise<Result<EmailResult>> {
    return tryCatch(async () => {
      const transporter = await this.getTransporter();

      const info = await transporter.sendMail({
        from: options.from ?? this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info({
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      }, 'SMTP email sent');

      return {
        messageId: info.messageId ?? `smtp-${Date.now()}`,
        provider: this.type,
      };
    });
  }

  async testConnection(): Promise<Result<boolean>> {
    return tryCatch(async () => {
      const transporter = await this.getTransporter();
      await transporter.verify();
      logger.info('SMTP email provider connection test: OK');
      return true;
    });
  }
}
