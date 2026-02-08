// ===========================================
// Storage Service
// ===========================================
// S3-compatible storage service using AWS SDK.
// Works with both AWS S3 and MinIO (local dev).

import {DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client,} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {type Result, tryCatch} from 'stderr-lib';
import {config} from '../config/index.js';
import {randomUUID} from 'crypto';
import logger from '../lib/logger.js';

// ===========================================
// Types
// ===========================================

interface UploadOptions {
  /** File content as Buffer */
  buffer: Buffer;
  /** Original filename (used to extract extension) */
  filename: string;
  /** MIME type */
  contentType: string;
  /** Folder/prefix in bucket (default: 'uploads') */
  folder?: string;
}

interface UploadResult {
  /** The S3 key for the uploaded file */
  key: string;
  /** Public URL (if bucket is public) */
  url: string;
  /** File size in bytes */
  size: number;
}

// ===========================================
// Storage Service
// ===========================================

export class StorageService {
  private static client: S3Client | null = null;

  /**
   * Get or create the S3 client (singleton)
   */
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

      // Generate unique key with original extension
      const ext = filename.includes('.') ? filename.split('.').pop() : '';
      const key = `${folder}/${randomUUID()}${ext ? `.${ext}` : ''}`;

      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.getClient().send(command);

      logger.info({
        key,
        size: buffer.length,
        contentType,
      }, 'File uploaded');

      return {
        key,
        url: this.getPublicUrl(key),
        size: buffer.length,
      };
    });
  }

  /**
   * Get a signed URL for temporary private access
   * @param key - The S3 key
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   */
  static async getSignedDownloadUrl(
    key: string,
    expiresIn = 3600
  ): Promise<Result<string>> {
    return tryCatch(async () => {
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });

      return await getSignedUrl(this.getClient(), command, {expiresIn});
    });
  }

  /**
   * Check if a file exists
   */
  static async exists(key: string): Promise<Result<boolean>> {
    return tryCatch(async () => {
      const command = new HeadObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });

      try {
        await this.getClient().send(command);
        return true;
      } catch (error) {
        const err = error as { name?: string };
        if (err.name === 'NotFound' || err.name === 'NoSuchKey') {
          return false;
        }
        throw error;
      }
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
      logger.info({ key }, 'File deleted');
    });
  }

  /**
   * Get public URL for a file
   * Works with MinIO when bucket is public
   */
  private static getPublicUrl(key: string): string {
    return `${config.S3_ENDPOINT}/${config.S3_BUCKET}/${key}`;
  }

  /**
   * Reset the client (useful for testing)
   */
  static resetClient(): void {
    this.client = null;
  }
}

