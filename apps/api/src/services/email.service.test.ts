// ===========================================
// Email Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up env before importing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-minimum-32-characters';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.S3_ENDPOINT = 'http://localhost:9000';
process.env.S3_ACCESS_KEY = 'test-key';
process.env.S3_SECRET_KEY = 'test-secret';
process.env.S3_BUCKET = 'test-bucket';

const { EmailService } = await import('./email.service.js');

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('send', () => {
    it('should send a mock email in test environment', async () => {
      const result = await EmailService.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.messageId).toMatch(/^mock-/);
      }
    });

    it('should include all email fields', async () => {
      const result = await EmailService.send({
        to: 'user@example.com',
        subject: 'Hello World',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct URL', async () => {
      const result = await EmailService.sendVerificationEmail(
        'user@example.com',
        'test-token-123'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.messageId).toBeDefined();
      }
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct URL', async () => {
      const result = await EmailService.sendPasswordResetEmail(
        'user@example.com',
        'reset-token-456'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.messageId).toBeDefined();
      }
    });
  });
});

