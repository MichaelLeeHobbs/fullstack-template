// ===========================================
// Audit Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';

// Mock the database
vi.mock('../lib/db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should log an audit event successfully', async () => {
      const context = {
        userId: 'user-123',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      };

      const result = await AuditService.log(
        AUDIT_ACTIONS.LOGIN_SUCCESS,
        context,
        'Login successful'
      );

      expect(result.ok).toBe(true);
    });

    it('should handle missing userId', async () => {
      const context = {
        ipAddress: '127.0.0.1',
      };

      const result = await AuditService.log(
        AUDIT_ACTIONS.LOGIN_FAILED,
        context,
        'Login failed',
        false
      );

      expect(result.ok).toBe(true);
    });

    it('should truncate long user agent', async () => {
      const context = {
        userId: 'user-123',
        userAgent: 'A'.repeat(600), // Longer than 500
      };

      const result = await AuditService.log(AUDIT_ACTIONS.REGISTER, context);

      expect(result.ok).toBe(true);
    });
  });

  describe('getContextFromRequest', () => {
    it('should extract context from request', () => {
      const mockReq = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
        user: { id: 'user-456' },
      };

      const context = AuditService.getContextFromRequest(mockReq);

      expect(context.userId).toBe('user-456');
      expect(context.ipAddress).toBe('192.168.1.1');
      expect(context.userAgent).toBe('Mozilla/5.0');
    });

    it('should handle missing fields', () => {
      const mockReq = {};

      const context = AuditService.getContextFromRequest(mockReq);

      expect(context.userId).toBeUndefined();
      expect(context.ipAddress).toBeUndefined();
      expect(context.userAgent).toBeUndefined();
    });
  });
});
