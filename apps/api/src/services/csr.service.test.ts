// ===========================================
// CSR Service Tests
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

vi.mock('../lib/pki-crypto.js', () => ({
  parseCSR: vi.fn().mockReturnValue({
    subject: {
      commonName: 'test.example.com',
      organization: 'Test Org',
      organizationalUnit: 'Test OU',
      country: 'US',
      state: 'California',
      locality: 'San Francisco',
    },
    extensions: {},
  }),
  signCertificate: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE-----\nMOCK_SIGNED_CERT\n-----END CERTIFICATE-----'),
  decryptPrivateKey: vi.fn().mockResolvedValue('-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----'),
  parseCertificate: vi.fn().mockReturnValue({
    subject: { commonName: 'test.example.com' },
    issuer: { commonName: 'Test CA' },
    serialNumber: '00000001',
    notBefore: new Date(),
    notAfter: new Date(),
    fingerprint: 'AA:BB:CC:DD',
    extensions: {},
    pem: '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----',
  }),
}));

vi.mock('./pki-audit.service.js', () => ({
  PkiAuditService: { log: vi.fn().mockResolvedValue({ ok: true, value: undefined }) },
  PKI_AUDIT_ACTIONS: {
    CSR_SUBMITTED: 'CSR_SUBMITTED',
    CSR_APPROVED: 'CSR_APPROVED',
    CSR_REJECTED: 'CSR_REJECTED',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { CsrService } from './csr.service.js';
import { __mocks } from '../lib/db.js';
import { parseCSR, decryptPrivateKey } from '../lib/pki-crypto.js';

const { mockSelect, mockInsert, mockUpdate, mockTransaction } = __mocks as unknown as {
  mockSelect: ReturnType<typeof vi.fn>;
  mockInsert: ReturnType<typeof vi.fn>;
  mockUpdate: ReturnType<typeof vi.fn>;
  mockDelete: ReturnType<typeof vi.fn>;
  mockTransaction: ReturnType<typeof vi.fn>;
};

// -----------------------------------------------------------------------
// Test constants
// -----------------------------------------------------------------------

const CA_ID = '10000000-0000-4000-8000-000000000001';
const ACTOR_ID = '10000000-0000-4000-a000-000000000001';
const PRIVATE_KEY_ID = '10000000-0000-4000-b000-000000000001';
const CERT_ID = '10000000-0000-4000-9000-000000000001';
const CSR_ID = '10000000-0000-4000-c000-000000000001';
const PROFILE_ID = '10000000-0000-4000-d000-000000000001';
const ISSUED_CERT_ID = '10000000-0000-4000-9000-000000000002';

const CSR_PEM = '-----BEGIN CERTIFICATE REQUEST-----\nMOCK_CSR\n-----END CERTIFICATE REQUEST-----';

const mockCa = {
  id: CA_ID,
  name: 'Test Root CA',
  commonName: 'Test Root CA',
  status: 'active',
  isRoot: true,
  privateKeyId: PRIVATE_KEY_ID,
  certificateId: CERT_ID,
  maxValidityDays: 3650,
  serialCounter: 1,
};

const mockPrivateKey = {
  id: PRIVATE_KEY_ID,
  encryptedPrivateKeyPem: 'encrypted-pem',
  kdfSalt: 'salt-hex',
  kdfIv: 'iv-hex',
  kdfTag: 'tag-hex',
};

const mockRequest = {
  id: CSR_ID,
  csrPem: CSR_PEM,
  commonName: 'test.example.com',
  subjectDn: 'CN=test.example.com, O=Test Org',
  targetCaId: CA_ID,
  profileId: null,
  status: 'pending',
  requestedBy: ACTOR_ID,
  approvedBy: null,
  certificateId: null,
  rejectionReason: null,
  sans: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CsrService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // submit
  // -----------------------------------------------------------------------

  describe('submit()', () => {
    it('should submit a new CSR successfully', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        // 1. Verify target CA exists
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: CA_ID }]),
          }),
        };
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRequest]),
        }),
      });

      const result = await CsrService.submit(
        { csrPem: CSR_PEM, targetCaId: CA_ID },
        ACTOR_ID,
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commonName).toBe('test.example.com');
        expect(result.value.targetCaId).toBe(CA_ID);
        expect(result.value.status).toBe('pending');
      }
    });

    it('should submit a CSR with profileId', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: CA_ID }]),
        }),
      });

      const requestWithProfile = { ...mockRequest, profileId: PROFILE_ID };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([requestWithProfile]),
        }),
      });

      const result = await CsrService.submit(
        { csrPem: CSR_PEM, targetCaId: CA_ID, profileId: PROFILE_ID },
        ACTOR_ID,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.profileId).toBe(PROFILE_ID);
      }
    });

    it('should return error when CSR PEM is invalid', async () => {
      vi.mocked(parseCSR).mockImplementationOnce(() => {
        throw new Error('Invalid PEM');
      });

      const result = await CsrService.submit(
        { csrPem: 'invalid-pem', targetCaId: CA_ID },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
        expect(result.error.message).toContain('parse');
      }
    });

    it('should return error when CSR has no Common Name', async () => {
      vi.mocked(parseCSR).mockReturnValueOnce({
        subject: {
          commonName: '',
          organization: undefined,
          organizationalUnit: undefined,
          country: undefined,
          state: undefined,
          locality: undefined,
        },
        extensions: {},
      } as any);

      const result = await CsrService.submit(
        { csrPem: CSR_PEM, targetCaId: CA_ID },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
        expect(result.error.message).toContain('Common Name');
      }
    });

    it('should return error when target CA is not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CsrService.submit(
        { csrPem: CSR_PEM, targetCaId: CA_ID },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  describe('getById()', () => {
    it('should return a CSR when found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRequest]),
        }),
      });

      const result = await CsrService.getById(CSR_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(CSR_ID);
        expect(result.value.commonName).toBe('test.example.com');
      }
    });

    it('should return error when CSR is not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CsrService.getById('10000000-0000-4000-c000-000000000099');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  describe('list()', () => {
    it('should return paginated list of CSRs', async () => {
      const requestList = [mockRequest, { ...mockRequest, id: '10000000-0000-4000-c000-000000000002' }];

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(requestList),
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

      const result = await CsrService.list({ page: 1, limit: 20 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.requests).toHaveLength(2);
        expect(result.value.total).toBe(2);
      }
    });

    it('should filter by status', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockRequest]),
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

      const result = await CsrService.list({ page: 1, limit: 20, status: 'pending' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.requests).toHaveLength(1);
        expect(result.value.total).toBe(1);
      }
    });

    it('should return empty list when no CSRs match', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        };
      });

      const result = await CsrService.list({ page: 1, limit: 20, targetCaId: CA_ID });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.requests).toHaveLength(0);
        expect(result.value.total).toBe(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // approve
  // -----------------------------------------------------------------------

  describe('approve()', () => {
    it('should approve a pending CSR and issue a certificate', async () => {
      // The approve method does many sequential selects before the transaction:
      // 1. Get CSR
      // 2. Get CA
      // 3. Get CA private key
      // 4. Get CA certificate PEM
      // Then an update for serial increment
      // Then a transaction (insert cert + update CSR)
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // 1. Get CSR
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockRequest]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // 2. Get target CA
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 3) {
          // 3. Get CA private key
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockPrivateKey]),
            }),
          };
        }
        // 4. Get CA certificate PEM
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_CA_CERT\n-----END CERTIFICATE-----',
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            }]),
          }),
        };
      });

      // Serial counter increment
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ serialCounter: 2 }]),
          }),
        }),
      });

      const issuedCert = {
        id: ISSUED_CERT_ID,
        issuingCaId: CA_ID,
        serialNumber: '00000001',
        commonName: 'test.example.com',
        certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_SIGNED_CERT\n-----END CERTIFICATE-----',
        fingerprint: 'AA:BB:CC:DD',
        status: 'active',
        certType: 'server',
      };

      const updatedRequest = {
        ...mockRequest,
        status: 'approved',
        certificateId: ISSUED_CERT_ID,
        approvedBy: ACTOR_ID,
      };

      // Transaction mock: insert cert, then update CSR
      mockTransaction.mockImplementationOnce(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const txInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([issuedCert]),
          }),
        });
        const txUpdate = vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedRequest]),
            }),
          }),
        });
        return cb({ select: mockSelect, insert: txInsert, update: txUpdate, delete: vi.fn() });
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.request.status).toBe('approved');
        expect(result.value.request.certificateId).toBe(ISSUED_CERT_ID);
        expect(result.value.certificate.id).toBe(ISSUED_CERT_ID);
        expect(result.value.certificate.serialNumber).toBe('00000001');
      }
    });

    it('should return error when CSR is not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'NOT_FOUND');
      }
    });

    it('should return error when CSR is already approved', async () => {
      const approvedRequest = { ...mockRequest, status: 'approved' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([approvedRequest]),
        }),
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
        expect(result.error.message).toContain('already');
      }
    });

    it('should return error when CSR is already rejected', async () => {
      const rejectedRequest = { ...mockRequest, status: 'rejected' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([rejectedRequest]),
        }),
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
      }
    });

    it('should return error when target CA is not found', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockRequest]),
            }),
          };
        }
        // CA not found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_FOUND');
      }
    });

    it('should return error when target CA is not active', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockRequest]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ ...mockCa, status: 'suspended' }]),
          }),
        };
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_ACTIVE');
      }
    });

    it('should return error when passphrase is incorrect', async () => {
      vi.mocked(decryptPrivateKey).mockRejectedValueOnce(new Error('Decryption failed'));

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockRequest]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        // CA private key
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPrivateKey]),
          }),
        };
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'wrong-passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_PASSPHRASE');
      }
    });

    it('should return error when CA has no associated certificate', async () => {
      const caWithoutCert = { ...mockCa, certificateId: null };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockRequest]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([caWithoutCert]),
            }),
          };
        }
        // CA private key
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPrivateKey]),
          }),
        };
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('associated certificate');
      }
    });

    it('should use profile extensions when profileId is set on CSR', async () => {
      const requestWithProfile = { ...mockRequest, profileId: PROFILE_ID };

      const mockProfile = {
        id: PROFILE_ID,
        name: 'TLS Server',
        certType: 'server',
        maxValidityDays: 365,
        keyUsage: ['digitalSignature', 'keyEncipherment'],
        extKeyUsage: ['serverAuth'],
        basicConstraints: { ca: false, pathLenConstraint: undefined },
      };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // 1. Get CSR (with profileId)
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([requestWithProfile]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // 2. Get target CA
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 3) {
          // 3. Get profile
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockProfile]),
            }),
          };
        }
        if (selectCallCount === 4) {
          // 4. Get CA private key
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockPrivateKey]),
            }),
          };
        }
        // 5. Get CA certificate PEM
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_CA_CERT\n-----END CERTIFICATE-----',
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            }]),
          }),
        };
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ serialCounter: 2 }]),
          }),
        }),
      });

      const issuedCert = {
        id: ISSUED_CERT_ID,
        issuingCaId: CA_ID,
        serialNumber: '00000001',
        commonName: 'test.example.com',
        certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_SIGNED_CERT\n-----END CERTIFICATE-----',
        fingerprint: 'AA:BB:CC:DD',
        status: 'active',
        certType: 'server',
      };

      const updatedRequest = {
        ...requestWithProfile,
        status: 'approved',
        certificateId: ISSUED_CERT_ID,
        approvedBy: ACTOR_ID,
      };

      mockTransaction.mockImplementationOnce(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const txInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([issuedCert]),
          }),
        });
        const txUpdate = vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedRequest]),
            }),
          }),
        });
        return cb({ select: mockSelect, insert: txInsert, update: txUpdate, delete: vi.fn() });
      });

      const result = await CsrService.approve(
        CSR_ID,
        { caPassphrase: 'passphrase' },
        ACTOR_ID,
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.certificate.certType).toBe('server');
      }
    });
  });

  // -----------------------------------------------------------------------
  // reject
  // -----------------------------------------------------------------------

  describe('reject()', () => {
    it('should reject a pending CSR with a reason', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRequest]),
        }),
      });

      const rejectedRequest = {
        ...mockRequest,
        status: 'rejected',
        rejectionReason: 'Domain not verified',
        approvedBy: ACTOR_ID,
      };

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([rejectedRequest]),
          }),
        }),
      });

      const result = await CsrService.reject(CSR_ID, 'Domain not verified', ACTOR_ID, '127.0.0.1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('rejected');
        expect(result.value.rejectionReason).toBe('Domain not verified');
      }
    });

    it('should return error when CSR is not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CsrService.reject(CSR_ID, 'reason', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'NOT_FOUND');
      }
    });

    it('should return error when CSR is already approved', async () => {
      const approvedRequest = { ...mockRequest, status: 'approved' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([approvedRequest]),
        }),
      });

      const result = await CsrService.reject(CSR_ID, 'Too late', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
        expect(result.error.message).toContain('already');
      }
    });

    it('should return error when CSR is already rejected', async () => {
      const rejectedRequest = { ...mockRequest, status: 'rejected' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([rejectedRequest]),
        }),
      });

      const result = await CsrService.reject(CSR_ID, 'Duplicate rejection', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
      }
    });
  });
});
