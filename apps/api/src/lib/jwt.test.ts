// ===========================================
// JWT Utility Tests
// ===========================================

import { describe, it, expect } from 'vitest';

// Set up env before importing modules that use config
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-minimum-32-characters';
process.env.LOG_LEVEL = 'error';

// Dynamic import to ensure env is set first
const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = await import('./jwt.js');

describe('JWT Utilities', () => {
  const testPayload = { userId: '123e4567-e89b-12d3-a456-426614174000' };

  describe('signAccessToken', () => {
    it('should create a valid JWT token', () => {
      const token = signAccessToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('signRefreshToken', () => {
    it('should create a valid JWT token', () => {
      const token = signRefreshToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = signAccessToken(testPayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should throw for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = signRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should throw for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });
  });
});

