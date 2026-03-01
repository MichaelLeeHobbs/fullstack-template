// ===========================================
// Cert Login Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
    return cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
  });

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      transaction: mockTransaction,
    },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction },
  };
});

vi.mock('../lib/jwt.js', () => ({
  signAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
}));

vi.mock('./pki-audit.service.js', () => ({
  PkiAuditService: { log: vi.fn().mockResolvedValue({ ok: true, value: undefined }) },
  PKI_AUDIT_ACTIONS: {
    CERT_LOGIN_SUCCESS: 'CERT_LOGIN_SUCCESS',
    CERT_LOGIN_FAILED: 'CERT_LOGIN_FAILED',
    CERT_ATTACHED: 'CERT_ATTACHED',
    CERT_BINDING_REMOVED: 'CERT_BINDING_REMOVED',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { CertLoginService } from './cert-login.service.js';
import { __mocks } from '../lib/db.js';
import type { ExtractedClientCert } from '../lib/extract-client-cert.js';

const { mockSelect, mockInsert, mockUpdate, mockDelete } = __mocks as unknown as {
  mockSelect: ReturnType<typeof vi.fn>;
  mockInsert: ReturnType<typeof vi.fn>;
  mockUpdate: ReturnType<typeof vi.fn>;
  mockDelete: ReturnType<typeof vi.fn>;
  mockTransaction: ReturnType<typeof vi.fn>;
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const USER_ID = '10000000-0000-4000-8000-000000000001';
const BINDING_ID = '10000000-0000-4000-8000-000000000002';
const SESSION_ID = '10000000-0000-4000-8000-000000000003';
const ATTACH_CODE_ID = '10000000-0000-4000-8000-000000000004';

function makeCert(overrides?: Partial<ExtractedClientCert>): ExtractedClientCert {
  return {
    authenticated: 'SUCCESS',
    dn: 'CN=Test User,O=Test Org',
    cn: 'Test User',
    serial: 'AABBCCDD',
    expiration: '2030-01-01T00:00:00Z',
    fingerprint: 'AA:BB:CC:DD',
    ...overrides,
  };
}

describe('CertLoginService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // loginWithCertificate
  // -----------------------------------------------------------------------

  describe('loginWithCertificate()', () => {
    it('should authenticate user and return tokens on success', async () => {
      const mockBinding = {
        id: BINDING_ID,
        userId: USER_ID,
        certificateSerial: 'AABBCCDD',
        certificateDn: 'CN=Test User,O=Test Org',
        status: 'active',
      };
      const mockUser = { id: USER_ID, email: 'test@example.com', isActive: true };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Look up certificate binding
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockBinding]),
            }),
          };
        }
        // Look up user
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        };
      });

      // Update lastLoginAt
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      // Create session (insert into sessions)
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: SESSION_ID }]),
        }),
      });

      const result = await CertLoginService.loginWithCertificate(
        makeCert(),
        { userAgent: 'TestAgent', ipAddress: '127.0.0.1' },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.user.id).toBe(USER_ID);
        expect(result.value.user.email).toBe('test@example.com');
        expect(result.value.accessToken).toBe('mock-access-token');
        expect(result.value.refreshToken).toBe('mock-refresh-token');
      }
    });

    it('should fail when certificate is not authenticated', async () => {
      const result = await CertLoginService.loginWithCertificate(
        makeCert({ authenticated: 'FAILED' }),
        { ipAddress: '127.0.0.1' },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_AUTHENTICATED');
      }
    });

    it('should fail when no binding is found for cert', async () => {
      // No binding found
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertLoginService.loginWithCertificate(
        makeCert(),
        { ipAddress: '127.0.0.1' },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_BOUND');
      }
    });

    it('should fail when user is not active', async () => {
      const mockBinding = {
        id: BINDING_ID,
        userId: USER_ID,
        certificateSerial: 'AABBCCDD',
        certificateDn: 'CN=Test User,O=Test Org',
        status: 'active',
      };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockBinding]),
            }),
          };
        }
        // User is inactive
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: USER_ID, email: 'test@example.com', isActive: false }]),
          }),
        };
      });

      const result = await CertLoginService.loginWithCertificate(makeCert());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'ACCOUNT_DEACTIVATED');
      }
    });

    it('should fail when user is not found', async () => {
      const mockBinding = {
        id: BINDING_ID,
        userId: USER_ID,
        status: 'active',
      };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockBinding]),
            }),
          };
        }
        // User not found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await CertLoginService.loginWithCertificate(makeCert());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'ACCOUNT_DEACTIVATED');
      }
    });
  });

  // -----------------------------------------------------------------------
  // generateAttachCode
  // -----------------------------------------------------------------------

  describe('generateAttachCode()', () => {
    it('should generate an attach code when under rate limit', async () => {
      const mockCode = {
        code: 'ABCD1234',
        expiresAt: new Date('2030-01-01'),
      };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        // Count query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        };
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCode]),
        }),
      });

      const result = await CertLoginService.generateAttachCode(USER_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.code).toBe('ABCD1234');
        expect(result.value.expiresAt).toEqual(new Date('2030-01-01'));
      }
    });

    it('should fail when rate limited (5+ codes per hour)', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await CertLoginService.generateAttachCode(USER_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'RATE_LIMITED');
      }
    });

    it('should fail when insert returns nothing', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertLoginService.generateAttachCode(USER_ID);

      expect(result.ok).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // attachCertificate
  // -----------------------------------------------------------------------

  describe('attachCertificate()', () => {
    it('should attach certificate to user account via valid code', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockAttachCode = {
        id: ATTACH_CODE_ID,
        userId: USER_ID,
        code: 'VALID_CODE',
        used: false,
        expiresAt: futureDate,
      };

      const mockBinding = {
        id: BINDING_ID,
        userId: USER_ID,
        certificateDn: 'CN=Test User,O=Test Org',
        certificateCn: 'Test User',
        certificateSerial: 'AABBCCDD',
        certificateFingerprint: 'AA:BB:CC:DD',
        status: 'active',
      };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Find attach code
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockAttachCode]),
            }),
          };
        }
        // Check existing binding (none found)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      // Insert binding
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockBinding]),
        }),
      });

      // Mark code as used
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertLoginService.attachCertificate(
        'VALID_CODE',
        makeCert(),
        'My Cert',
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.userId).toBe(USER_ID);
        expect(result.value.certificateSerial).toBe('AABBCCDD');
        expect(result.value.status).toBe('active');
      }
    });

    it('should fail with invalid/used attach code', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertLoginService.attachCertificate(
        'BAD_CODE',
        makeCert(),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'ATTACH_CODE_INVALID');
      }
    });

    it('should fail with expired attach code', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: ATTACH_CODE_ID,
            userId: USER_ID,
            code: 'EXPIRED_CODE',
            used: false,
            expiresAt: pastDate,
          }]),
        }),
      });

      const result = await CertLoginService.attachCertificate(
        'EXPIRED_CODE',
        makeCert(),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'ATTACH_CODE_EXPIRED');
      }
    });

    it('should fail when certificate is not authenticated', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: ATTACH_CODE_ID,
            userId: USER_ID,
            code: 'VALID_CODE',
            used: false,
            expiresAt: futureDate,
          }]),
        }),
      });

      const result = await CertLoginService.attachCertificate(
        'VALID_CODE',
        makeCert({ authenticated: 'FAILED' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_AUTHENTICATED');
      }
    });

    it('should fail when certificate is already bound', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                id: ATTACH_CODE_ID,
                userId: USER_ID,
                code: 'VALID_CODE',
                used: false,
                expiresAt: futureDate,
              }]),
            }),
          };
        }
        // Existing binding found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000099' }]),
          }),
        };
      });

      const result = await CertLoginService.attachCertificate(
        'VALID_CODE',
        makeCert(),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'ALREADY_EXISTS');
      }
    });
  });

  // -----------------------------------------------------------------------
  // getCertStatus
  // -----------------------------------------------------------------------

  describe('getCertStatus()', () => {
    it('should return all bindings for a user', async () => {
      const bindings = [
        { id: BINDING_ID, userId: USER_ID, certificateDn: 'CN=Cert1', status: 'active' },
        { id: '10000000-0000-4000-8000-000000000005', userId: USER_ID, certificateDn: 'CN=Cert2', status: 'active' },
      ];

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(bindings),
          }),
        }),
      });

      const result = await CertLoginService.getCertStatus(USER_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].certificateDn).toBe('CN=Cert1');
      }
    });

    it('should return empty array when user has no bindings', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await CertLoginService.getCertStatus(USER_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // removeBinding
  // -----------------------------------------------------------------------

  describe('removeBinding()', () => {
    it('should remove a binding owned by the user', async () => {
      const mockBinding = {
        id: BINDING_ID,
        userId: USER_ID,
        certificateDn: 'CN=Test User',
        certificateSerial: 'AABBCCDD',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockBinding]),
        }),
      });

      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await CertLoginService.removeBinding(BINDING_ID, USER_ID, '127.0.0.1');

      expect(result.ok).toBe(true);
    });

    it('should fail when binding is not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertLoginService.removeBinding(BINDING_ID, USER_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'NOT_FOUND');
      }
    });
  });
});
