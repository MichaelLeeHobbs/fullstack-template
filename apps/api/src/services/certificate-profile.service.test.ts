// ===========================================
// Certificate Profile Service Tests
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

vi.mock('./pki-audit.service.js', () => ({
  PkiAuditService: { log: vi.fn().mockResolvedValue({ ok: true, value: undefined }) },
  PKI_AUDIT_ACTIONS: {
    PROFILE_CREATED: 'PROFILE_CREATED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    PROFILE_DELETED: 'PROFILE_DELETED',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { CertificateProfileService } from './certificate-profile.service.js';
import { __mocks } from '../lib/db.js';

const { mockSelect, mockInsert, mockUpdate, mockDelete } = __mocks as unknown as {
  mockSelect: ReturnType<typeof vi.fn>;
  mockInsert: ReturnType<typeof vi.fn>;
  mockUpdate: ReturnType<typeof vi.fn>;
  mockDelete: ReturnType<typeof vi.fn>;
  mockTransaction: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const ACTOR_ID = '10000000-0000-4000-a000-000000000001';
const ACTOR_IP = '127.0.0.1';
const PROFILE_ID = '10000000-0000-4000-8000-000000000001';

const mockProfile = {
  id: PROFILE_ID,
  name: 'TLS Server',
  description: 'Standard TLS server certificate',
  certType: 'server',
  allowedKeyAlgorithms: ['rsa', 'ecdsa'],
  minKeySize: 2048,
  keyUsage: ['digitalSignature', 'keyEncipherment'],
  extKeyUsage: ['serverAuth'],
  basicConstraints: null,
  maxValidityDays: 365,
  subjectConstraints: null,
  sanConstraints: null,
  isBuiltIn: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CertificateProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------

  describe('create()', () => {
    it('should create a profile and return it', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      const result = await CertificateProfileService.create(
        {
          name: 'TLS Server',
          certType: 'server',
          allowedKeyAlgorithms: ['rsa', 'ecdsa'],
          minKeySize: 2048,
          keyUsage: ['digitalSignature', 'keyEncipherment'],
          extKeyUsage: ['serverAuth'],
          maxValidityDays: 365,
        },
        ACTOR_ID,
        ACTOR_IP,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('TLS Server');
        expect(result.value.certType).toBe('server');
        expect(result.value.id).toBe(PROFILE_ID);
      }
    });

    it('should return error when insert fails', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateProfileService.create(
        {
          name: 'Fail',
          certType: 'server',
          allowedKeyAlgorithms: ['rsa'],
          minKeySize: 2048,
          keyUsage: ['digitalSignature'],
          extKeyUsage: [],
          maxValidityDays: 365,
        },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  describe('getById()', () => {
    it('should return profile when found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      const result = await CertificateProfileService.getById(PROFILE_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(PROFILE_ID);
        expect(result.value.name).toBe('TLS Server');
      }
    });

    it('should return error with PROFILE_NOT_FOUND when not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateProfileService.getById('10000000-0000-4000-8000-000000000099');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  describe('list()', () => {
    it('should return paginated list of profiles', async () => {
      const profileList = [
        mockProfile,
        { ...mockProfile, id: '10000000-0000-4000-8000-000000000002', name: 'Client Auth' },
      ];

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(profileList),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        };
      });

      const result = await CertificateProfileService.list({ page: 1, limit: 20 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.profiles).toHaveLength(2);
        expect(result.value.total).toBe(2);
      }
    });

    it('should filter by certType when provided', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockProfile]),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        };
      });

      const result = await CertificateProfileService.list({ page: 1, limit: 20, certType: 'server' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.profiles).toHaveLength(1);
        expect(result.value.total).toBe(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update()', () => {
    it('should update profile and return updated record', async () => {
      const updatedProfile = { ...mockProfile, name: 'Updated TLS Server' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedProfile]),
          }),
        }),
      });

      const result = await CertificateProfileService.update(
        PROFILE_ID,
        { name: 'Updated TLS Server' },
        ACTOR_ID,
        ACTOR_IP,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Updated TLS Server');
      }
    });

    it('should return PROFILE_NOT_FOUND when profile does not exist', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateProfileService.update(
        '10000000-0000-4000-8000-000000000099',
        { name: 'Does not exist' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_NOT_FOUND');
      }
    });

    it('should return error when update returns empty', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await CertificateProfileService.update(
        PROFILE_ID,
        { name: 'Fail' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------

  describe('delete()', () => {
    it('should delete profile and return success message', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await CertificateProfileService.delete(PROFILE_ID, ACTOR_ID, ACTOR_IP);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.message).toBe('Certificate profile deleted successfully');
      }
    });

    it('should return PROFILE_NOT_FOUND when profile does not exist', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateProfileService.delete(
        '10000000-0000-4000-8000-000000000099',
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_NOT_FOUND');
      }
    });

    it('should return SYSTEM_PROTECTED when deleting a built-in profile', async () => {
      const builtInProfile = { ...mockProfile, isBuiltIn: true };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([builtInProfile]),
        }),
      });

      const result = await CertificateProfileService.delete(PROFILE_ID, ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'SYSTEM_PROTECTED');
      }
    });
  });

  // -----------------------------------------------------------------------
  // validateAgainstProfile
  // -----------------------------------------------------------------------

  describe('validateAgainstProfile()', () => {
    it('should pass when all constraints are satisfied', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      const result = await CertificateProfileService.validateAgainstProfile(
        PROFILE_ID,
        'rsa',
        4096,
        365,
      );

      expect(result.ok).toBe(true);
    });

    it('should return PROFILE_NOT_FOUND when profile does not exist', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateProfileService.validateAgainstProfile(
        '10000000-0000-4000-8000-000000000099',
        'rsa',
        2048,
        365,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_NOT_FOUND');
      }
    });

    it('should reject disallowed key algorithm', async () => {
      const rsaOnlyProfile = { ...mockProfile, allowedKeyAlgorithms: ['rsa'] };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([rsaOnlyProfile]),
        }),
      });

      const result = await CertificateProfileService.validateAgainstProfile(
        PROFILE_ID,
        'ecdsa',
        undefined,
        365,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_CONSTRAINT_VIOLATION');
      }
    });

    it('should reject key size below minimum', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      const result = await CertificateProfileService.validateAgainstProfile(
        PROFILE_ID,
        'rsa',
        1024,
        365,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_CONSTRAINT_VIOLATION');
      }
    });

    it('should use default key size of 2048 when undefined', async () => {
      const highMinProfile = { ...mockProfile, minKeySize: 4096 };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([highMinProfile]),
        }),
      });

      // keySize undefined should default to 2048, which is below 4096
      const result = await CertificateProfileService.validateAgainstProfile(
        PROFILE_ID,
        'rsa',
        undefined,
        365,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_CONSTRAINT_VIOLATION');
      }
    });

    it('should reject validity days exceeding maximum', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      });

      const result = await CertificateProfileService.validateAgainstProfile(
        PROFILE_ID,
        'rsa',
        2048,
        730, // exceeds 365
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'PROFILE_CONSTRAINT_VIOLATION');
      }
    });
  });
});
