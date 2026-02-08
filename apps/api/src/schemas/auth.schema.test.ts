// ===========================================
// Auth Schema Validation Tests
// ===========================================

import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'PasswordABC',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate a valid login', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid',
        password: 'password',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    it('should validate a valid refresh token', () => {
      const result = refreshSchema.safeParse({
        refreshToken: 'some-token-value',
      });
      expect(result.success).toBe(true);
    });

    it('should accept missing refresh token (comes from httpOnly cookie)', () => {
      const result = refreshSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token string', () => {
      const result = refreshSchema.safeParse({
        refreshToken: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

