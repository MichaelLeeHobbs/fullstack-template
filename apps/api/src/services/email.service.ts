// ===========================================
// Email Service
// ===========================================
// Sends emails using mock (dev) or AWS SES (prod).
// In development, emails are logged to console.

import { tryCatch, type Result, type StdError } from 'stderr-lib';
import { config } from '../config/index.js';
import logger from '../lib/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface EmailResult {
  messageId: string;
}

// Helper to wrap async operations with tryCatch - properly typed
async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, StdError>> {
  return await (tryCatch(fn) as unknown as Promise<Result<T, StdError>>);
}

export class EmailService {
  /**
   * Send an email. In development, logs to console.
   * In production, uses AWS SES.
   */
  static async send(options: EmailOptions): Promise<Result<EmailResult>> {
    if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
      return this.sendMock(options);
    }
    return this.sendSES(options);
  }

  /**
   * Mock email - logs to console for development
   */
  private static async sendMock(options: EmailOptions): Promise<Result<EmailResult>> {
    return tryAsync(async () => {
      const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      logger.info('📧 MOCK EMAIL SENT', {
        messageId,
        to: options.to,
        subject: options.subject,
      });

      // Log full content at debug level for testing
      logger.debug('Email content', {
        text: options.text?.substring(0, 200),
        htmlPreview: options.html?.substring(0, 300),
      });

      return { messageId };
    });
  }

  /**
   * AWS SES email - for production
   */
  private static async sendSES(options: EmailOptions): Promise<Result<EmailResult>> {
    // TODO: Implement when deploying to production
    // return tryAsync(async () => {
    //   const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
    //   const client = new SESClient({ region: config.AWS_SES_REGION });
    //   const command = new SendEmailCommand({
    //     Source: config.EMAIL_FROM,
    //     Destination: { ToAddresses: [options.to] },
    //     Message: {
    //       Subject: { Data: options.subject },
    //       Body: {
    //         Text: options.text ? { Data: options.text } : undefined,
    //         Html: options.html ? { Data: options.html } : undefined,
    //       },
    //     },
    //   });
    //   const response = await client.send(command);
    //   return { messageId: response.MessageId || 'unknown' };
    // });

    logger.warn('SES not implemented, falling back to mock email');
    return this.sendMock(options);
  }

  // ===========================================
  // Convenience Methods
  // ===========================================

  /**
   * Send email verification link
   */
  static async sendVerificationEmail(
    email: string,
    token: string
  ): Promise<Result<EmailResult>> {
    const verifyUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;

    return this.send({
      to: email,
      subject: 'Verify your email - App Name',
      text: `Welcome to App Name!

Click this link to verify your email:
${verifyUrl}

This link expires in 24 hours.

If you didn't create an account, you can ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1976d2; margin-top: 0;">Welcome to App Name!</h1>
    <p style="color: #333; font-size: 16px; line-height: 1.5;">
      Click the button below to verify your email address:
    </p>
    <p style="margin: 30px 0; text-align: center;">
      <a href="${verifyUrl}"
         style="background: #1976d2; color: white; padding: 14px 28px;
                text-decoration: none; border-radius: 6px; font-weight: 500;
                display: inline-block;">
        Verify Email
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #1976d2; font-size: 14px; word-break: break-all;">
      ${verifyUrl}
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">
      This link expires in 24 hours. If you didn't create an account, you can ignore this email.
    </p>
  </div>
</body>
</html>`,
    });
  }

  /**
   * Send password reset link
   */
  static async sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<Result<EmailResult>> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;

    return this.send({
      to: email,
      subject: 'Reset your password - App Name',
      text: `You requested a password reset.

Click this link to reset your password:
${resetUrl}

This link expires in 1 hour.

If you didn't request this, you can safely ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #333; margin-top: 0;">Reset your password</h1>
    <p style="color: #333; font-size: 16px; line-height: 1.5;">
      You requested a password reset. Click the button below to choose a new password:
    </p>
    <p style="margin: 30px 0; text-align: center;">
      <a href="${resetUrl}"
         style="background: #1976d2; color: white; padding: 14px 28px;
                text-decoration: none; border-radius: 6px; font-weight: 500;
                display: inline-block;">
        Reset Password
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #1976d2; font-size: 14px; word-break: break-all;">
      ${resetUrl}
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">
      This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`,
    });
  }
}

