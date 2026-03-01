# Feature 00b: Core Services

> Status: 📋 Planned

## Overview

Shared infrastructure services used by multiple features. These are foundational services that provide common functionality like email sending, file storage, and caching.

## Dependencies

- [00_project-setup.md](./00_project-setup.md) - Base project structure

---

## Services

### 1. EmailService

Abstraction for sending emails. Uses mock/console logging in development, real provider (AWS SES) in production.

```typescript
// apps/api/src/services/email.service.ts
import { tryCatch, type Result } from 'stderr-lib';
import { config } from '../config';
import logger from '../lib/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface EmailResult {
  messageId: string;
}

export class EmailService {
  /**
   * Send an email. In development, logs to console.
   * In production, uses AWS SES.
   */
  static async send(options: EmailOptions): Promise<Result<EmailResult>> {
    if (config.NODE_ENV === 'development') {
      return this.sendMock(options);
    }
    return this.sendSES(options);
  }

  private static async sendMock(options: EmailOptions): Promise<Result<EmailResult>> {
    return tryCatch(async () => {
      const messageId = `mock-${Date.now()}`;
      
      logger.info('📧 MOCK EMAIL', {
        messageId,
        to: options.to,
        subject: options.subject,
        text: options.text?.substring(0, 200),
      });

      // In dev, also log the full content for debugging
      if (options.html) {
        logger.debug('Email HTML content', { html: options.html });
      }

      return { messageId };
    });
  }

  private static async sendSES(options: EmailOptions): Promise<Result<EmailResult>> {
    return tryCatch(async () => {
      // TODO: Implement AWS SES integration
      // const ses = new SESClient({ region: config.AWS_REGION });
      // const command = new SendEmailCommand({ ... });
      // const response = await ses.send(command);
      throw new Error('SES not implemented - set NODE_ENV=development for mock emails');
    });
  }

  // Convenience methods
  static async sendVerificationEmail(email: string, token: string): Promise<Result<EmailResult>> {
    const verifyUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;
    
    return this.send({
      to: email,
      subject: 'Verify your email - App Name',
      text: `Click this link to verify your email: ${verifyUrl}`,
      html: `
        <h1>Verify your email</h1>
        <p>Click the link below to verify your email address:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>This link expires in 24 hours.</p>
      `,
    });
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<Result<EmailResult>> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    
    return this.send({
      to: email,
      subject: 'Reset your password - App Name',
      text: `Click this link to reset your password: ${resetUrl}`,
      html: `
        <h1>Reset your password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });
  }
}
```

---

### 2. StorageService

Abstraction for file storage. Uses S3/MinIO for both dev and prod (MinIO is S3-compatible).

```typescript
// apps/api/src/services/storage.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { tryCatch, type Result } from 'stderr-lib';
import { config } from '../config';
import { randomUUID } from 'crypto';

interface UploadOptions {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder?: string;
}

interface UploadResult {
  key: string;
  url: string;
}

export class StorageService {
  private static client: S3Client | null = null;

  private static getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        endpoint: config.S3_ENDPOINT,
        region: config.S3_REGION,
        credentials: {
          accessKeyId: config.S3_ACCESS_KEY,
          secretAccessKey: config.S3_SECRET_KEY,
        },
        forcePathStyle: true, // Required for MinIO
      });
    }
    return this.client;
  }

  /**
   * Upload a file to S3/MinIO
   */
  static async upload(options: UploadOptions): Promise<Result<UploadResult>> {
    return tryCatch(async () => {
      const { buffer, filename, contentType, folder = 'uploads' } = options;
      
      // Generate unique key
      const ext = filename.split('.').pop() || '';
      const key = `${folder}/${randomUUID()}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.getClient().send(command);

      // Generate URL (for MinIO in dev, this is the direct URL)
      const url = `${config.S3_ENDPOINT}/${config.S3_BUCKET}/${key}`;

      return { key, url };
    });
  }

  /**
   * Get a signed URL for temporary access
   */
  static async getSignedUrl(key: string, expiresIn = 3600): Promise<Result<string>> {
    return tryCatch(async () => {
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });

      const url = await getSignedUrl(this.getClient(), command, { expiresIn });
      return url;
    });
  }

  /**
   * Delete a file from S3/MinIO
   */
  static async delete(key: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const command = new DeleteObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });

      await this.getClient().send(command);
    });
  }
}
```

---

### 3. ConfigService (Runtime Settings)

Reads runtime configuration from database. See [00c_system-settings.md](00d_system-settings.md).

---

## Environment Variables

These services require the following environment variables:

```env
# Already in .env - keep as-is (infrastructure secrets)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=app_app_ak
S3_SECRET_KEY=...
S3_BUCKET=app-assets
S3_REGION=us-east-1

# Add for email (production only)
AWS_SES_REGION=us-east-1
EMAIL_FROM=noreply@app.app

# Add for frontend URL (used in email links)
FRONTEND_URL=http://localhost:5173
```

---

## Dependencies

```bash
# S3/MinIO client
pnpm --filter api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# AWS SES (for production email)
pnpm --filter api add @aws-sdk/client-ses
```

---

## Acceptance Criteria

### EmailService
- [ ] Mock emails logged to console in development
- [ ] Email contains correct verification/reset URLs
- [ ] Production uses AWS SES (future)
- [ ] Errors are properly caught and returned as Result

### StorageService
- [ ] Can upload files to MinIO in development
- [ ] Can generate signed URLs for access
- [ ] Can delete files
- [ ] Uses S3-compatible API for production readiness

---

## Notes

- EmailService is mocked in dev to avoid needing SMTP setup
- StorageService uses MinIO locally (S3-compatible)
- Both services use Result pattern for error handling
- AWS SES integration deferred until production deployment

