// ===========================================
// PKI Audit Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
    },
    __mocks: { mockInsert, mockSelect },
  };
});

import { PkiAuditService, PKI_AUDIT_ACTIONS } from './pki-audit.service.js';
import { __mocks } from '../lib/db.js';

const { mockInsert, mockSelect } = __mocks as unknown as {
  mockInsert: ReturnType<typeof vi.fn>;
  mockSelect: ReturnType<typeof vi.fn>;
};

describe('PkiAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should insert an audit log entry', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CA_CREATED,
        actorId: '10000000-0000-4000-8000-000000000001',
        actorIp: '127.0.0.1',
        targetType: 'ca',
        targetId: '10000000-0000-4000-8000-000000000002',
        details: { name: 'Test Root CA' },
        success: true,
      });

      expect(result.ok).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const valuesCall = mockInsert.mock.results[0]?.value.values;
      expect(valuesCall).toHaveBeenCalledWith({
        action: 'CA_CREATED',
        actorId: '10000000-0000-4000-8000-000000000001',
        actorIp: '127.0.0.1',
        targetType: 'ca',
        targetId: '10000000-0000-4000-8000-000000000002',
        details: { name: 'Test Root CA' },
        success: true,
        errorMessage: null,
      });
    });

    it('should default optional fields to null', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CERT_ISSUED,
        targetType: 'certificate',
      });

      expect(result.ok).toBe(true);
      const valuesCall = mockInsert.mock.results[0]?.value.values;
      expect(valuesCall).toHaveBeenCalledWith({
        action: 'CERT_ISSUED',
        actorId: null,
        actorIp: null,
        targetType: 'certificate',
        targetId: null,
        details: null,
        success: true,
        errorMessage: null,
      });
    });

    it('should log failed operations with error message', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.PASSPHRASE_FAILED,
        actorId: '10000000-0000-4000-8000-000000000001',
        targetType: 'ca',
        targetId: '10000000-0000-4000-8000-000000000002',
        success: false,
        errorMessage: 'Invalid passphrase',
      });

      expect(result.ok).toBe(true);
      const valuesCall = mockInsert.mock.results[0]?.value.values;
      expect(valuesCall).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Invalid passphrase',
        }),
      );
    });

    it('should return error result on db failure', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      });

      const result = await PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CA_CREATED,
        targetType: 'ca',
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('list', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: '1', action: 'CA_CREATED', targetType: 'ca', createdAt: new Date() },
      ];

      // Both select calls happen in parallel via Promise.all
      mockSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        });

      const result = await PkiAuditService.list({ page: 1, limit: 10 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.logs).toHaveLength(1);
        expect(result.value.total).toBe(1);
      }
    });
  });

  describe('PKI_AUDIT_ACTIONS', () => {
    it('should contain all expected action types', () => {
      expect(PKI_AUDIT_ACTIONS.CA_CREATED).toBe('CA_CREATED');
      expect(PKI_AUDIT_ACTIONS.CERT_ISSUED).toBe('CERT_ISSUED');
      expect(PKI_AUDIT_ACTIONS.CSR_APPROVED).toBe('CSR_APPROVED');
      expect(PKI_AUDIT_ACTIONS.CRL_GENERATED).toBe('CRL_GENERATED');
      expect(PKI_AUDIT_ACTIONS.CERT_LOGIN_SUCCESS).toBe('CERT_LOGIN_SUCCESS');
      expect(PKI_AUDIT_ACTIONS.KEY_GENERATED).toBe('KEY_GENERATED');
    });
  });
});
