// ===========================================
// Email Provider Interface
// ===========================================
// Defines the contract for email providers (mock, SMTP, SES).

import { type Result } from 'stderr-lib';

// ===========================================
// Types
// ===========================================

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string; // Optional override of default sender
}

export interface EmailResult {
  messageId: string;
  provider: EmailProviderType;
}

export const EmailProviderType = {
  Mock: 'mock',
  SMTP: 'smtp',
  SES: 'ses',
} as const;
export type EmailProviderType = (typeof EmailProviderType)[keyof typeof EmailProviderType];

// ===========================================
// Provider Interface
// ===========================================

export interface EmailProvider {
  /** Provider type identifier */
  readonly type: EmailProviderType;

  /** Send an email */
  send(options: EmailOptions): Promise<Result<EmailResult>>;

  /** Test provider connection/configuration */
  testConnection(): Promise<Result<boolean>>;
}
