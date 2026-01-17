// ===========================================
// Storage Service Tests
// ===========================================
// Note: These are unit tests that mock the S3 client.
// For integration tests with actual MinIO, use a separate test file.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDK before importing
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
}));

// Set up env before importing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-minimum-32-characters';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.S3_ENDPOINT = 'http://localhost:9000';
process.env.S3_ACCESS_KEY = 'test-key';
process.env.S3_SECRET_KEY = 'test-secret';
process.env.S3_BUCKET = 'test-bucket';

const { StorageService } = await import('./storage.service.js');

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    StorageService.resetClient();
  });

  describe('upload', () => {
    it('should upload a file and return key and URL', async () => {
      const buffer = Buffer.from('Hello, World!');

      const result = await StorageService.upload({
        buffer,
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.key).toMatch(/^uploads\/.*\.txt$/);
        expect(result.value.url).toContain('http://localhost:9000');
        expect(result.value.size).toBe(buffer.length);
      }
    });

    it('should use custom folder when provided', async () => {
      const buffer = Buffer.from('test');

      const result = await StorageService.upload({
        buffer,
        filename: 'image.png',
        contentType: 'image/png',
        folder: 'avatars',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.key).toMatch(/^avatars\/.*\.png$/);
      }
    });

    it('should handle files without extension', async () => {
      const buffer = Buffer.from('data');

      const result = await StorageService.upload({
        buffer,
        filename: 'noext',
        contentType: 'application/octet-stream',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.key).toMatch(/^uploads\/[a-f0-9-]+$/);
      }
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('should return a signed URL', async () => {
      const result = await StorageService.getSignedDownloadUrl('test/key.txt');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('https://signed-url.example.com');
      }
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      const result = await StorageService.delete('test/key.txt');

      expect(result.ok).toBe(true);
    });
  });
});

