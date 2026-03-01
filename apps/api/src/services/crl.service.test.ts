// ===========================================
// CRL Service Tests
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
  signCRL: vi.fn().mockReturnValue('-----BEGIN X509 CRL-----\nMOCK_CRL\n-----END X509 CRL-----'),
  decryptPrivateKey: vi.fn().mockResolvedValue('-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----'),
}));

vi.mock('./pki-audit.service.js', () => ({
  PkiAuditService: { log: vi.fn().mockResolvedValue({ ok: true, value: undefined }) },
  PKI_AUDIT_ACTIONS: {
    CRL_GENERATED: 'CRL_GENERATED',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { CrlService } from './crl.service.js';
import { __mocks } from '../lib/db.js';
import { decryptPrivateKey } from '../lib/pki-crypto.js';

const { mockSelect, mockInsert } = __mocks as unknown as {
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
const CRL_ID = '10000000-0000-4000-c000-000000000001';

const mockCa = {
  id: CA_ID,
  name: 'Test Root CA',
  commonName: 'Test Root CA',
  status: 'active',
  isRoot: true,
  privateKeyId: PRIVATE_KEY_ID,
  certificateId: CERT_ID,
};

const mockPrivateKey = {
  id: PRIVATE_KEY_ID,
  encryptedPrivateKeyPem: 'encrypted-pem',
  kdfSalt: 'salt-hex',
  kdfIv: 'iv-hex',
  kdfTag: 'tag-hex',
};

const mockCrl = {
  id: CRL_ID,
  caId: CA_ID,
  crlNumber: 1,
  crlPem: '-----BEGIN X509 CRL-----\nMOCK_CRL\n-----END X509 CRL-----',
  thisUpdate: new Date(),
  nextUpdate: new Date(),
  entriesCount: 0,
  createdAt: new Date(),
};

describe('CrlService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // generate
  // -----------------------------------------------------------------------

  describe('generate()', () => {
    it('should generate a CRL for an active CA with no revocations', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // 1. Fetch CA
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // 2. Get revocations (inner join)
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          // 3. Get max CRL number
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxNumber: 0 }]),
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
              certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
            }]),
          }),
        };
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockCrl, crlNumber: 1, entriesCount: 0 }]),
        }),
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID, '127.0.0.1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.caId).toBe(CA_ID);
        expect(result.value.crlNumber).toBe(1);
        expect(result.value.entriesCount).toBe(0);
      }
    });

    it('should generate a CRL for a suspended CA', async () => {
      const suspendedCa = { ...mockCa, status: 'suspended' };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([suspendedCa]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxNumber: 2 }]),
            }),
          };
        }
        if (selectCallCount === 4) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockPrivateKey]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
            }]),
          }),
        };
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockCrl, crlNumber: 3, entriesCount: 0 }]),
        }),
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.crlNumber).toBe(3);
      }
    });

    it('should include revoked certificates in the CRL', async () => {
      const revokedCerts = [
        { serialNumber: '00000001', revokedAt: new Date(), reason: 'keyCompromise' },
        { serialNumber: '00000002', revokedAt: new Date(), reason: 'cessationOfOperation' },
      ];

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(revokedCerts),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxNumber: 5 }]),
            }),
          };
        }
        if (selectCallCount === 4) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockPrivateKey]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
            }]),
          }),
        };
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockCrl, crlNumber: 6, entriesCount: 2 }]),
        }),
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID, '127.0.0.1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.entriesCount).toBe(2);
        expect(result.value.crlNumber).toBe(6);
      }
    });

    it('should return error when CA is not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_FOUND');
      }
    });

    it('should return error when CA is retired', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ ...mockCa, status: 'retired' }]),
        }),
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_ACTIVE');
      }
    });

    it('should return error when CA private key is not found', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxNumber: 0 }]),
            }),
          };
        }
        // Private key not found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('private key not found');
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
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxNumber: 0 }]),
            }),
          };
        }
        // Private key found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPrivateKey]),
          }),
        };
      });

      const result = await CrlService.generate(CA_ID, 'wrong-passphrase', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_PASSPHRASE');
      }
    });

    it('should return error when CA has no certificate', async () => {
      const caWithoutCert = { ...mockCa, certificateId: null };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([caWithoutCert]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxNumber: 0 }]),
            }),
          };
        }
        if (selectCallCount === 4) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockPrivateKey]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('associated certificate');
      }
    });

    it('should return error when CA certificate record is not found', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxNumber: 0 }]),
            }),
          };
        }
        if (selectCallCount === 4) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockPrivateKey]),
            }),
          };
        }
        // CA certificate not found in DB
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await CrlService.generate(CA_ID, 'passphrase', ACTOR_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('certificate not found');
      }
    });
  });

  // -----------------------------------------------------------------------
  // getLatest
  // -----------------------------------------------------------------------

  describe('getLatest()', () => {
    it('should return the most recent CRL for a CA', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCrl]),
            }),
          }),
        }),
      });

      const result = await CrlService.getLatest(CA_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.caId).toBe(CA_ID);
        expect(result.value.crlNumber).toBe(1);
      }
    });

    it('should return error when no CRL is found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await CrlService.getLatest(CA_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // getHistory
  // -----------------------------------------------------------------------

  describe('getHistory()', () => {
    it('should return paginated CRL history', async () => {
      const crlList = [
        { ...mockCrl, crlNumber: 3 },
        { ...mockCrl, id: '10000000-0000-4000-c000-000000000002', crlNumber: 2 },
      ];

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Main query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(crlList),
                  }),
                }),
              }),
            }),
          };
        }
        // Count query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        };
      });

      const result = await CrlService.getHistory(CA_ID, 1, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.crls).toHaveLength(2);
        expect(result.value.total).toBe(5);
      }
    });

    it('should return empty list when no CRLs exist', async () => {
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

      const result = await CrlService.getHistory(CA_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.crls).toHaveLength(0);
        expect(result.value.total).toBe(0);
      }
    });

    it('should apply pagination correctly', async () => {
      const crlList = [{ ...mockCrl, crlNumber: 1 }];

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(crlList),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 15 }]),
          }),
        };
      });

      const result = await CrlService.getHistory(CA_ID, 2, 5);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total).toBe(15);
      }
    });
  });
});
