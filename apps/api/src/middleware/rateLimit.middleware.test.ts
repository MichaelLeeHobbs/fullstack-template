// ===========================================
// Rate Limit Middleware Tests
// ===========================================

import { describe, it, expect } from 'vitest';
import {
  authRateLimiter,
  passwordResetRateLimiter,
  registrationRateLimiter,
  apiRateLimiter,
  apiKeyRateLimiter,
} from './rateLimit.middleware.js';

describe('Rate Limit Middleware', () => {
  it('should export authRateLimiter as a middleware function', () => {
    expect(typeof authRateLimiter).toBe('function');
  });

  it('should export passwordResetRateLimiter as a middleware function', () => {
    expect(typeof passwordResetRateLimiter).toBe('function');
  });

  it('should export registrationRateLimiter as a middleware function', () => {
    expect(typeof registrationRateLimiter).toBe('function');
  });

  it('should export apiRateLimiter as a middleware function', () => {
    expect(typeof apiRateLimiter).toBe('function');
  });

  it('should export apiKeyRateLimiter as a middleware function', () => {
    expect(typeof apiKeyRateLimiter).toBe('function');
  });
});
