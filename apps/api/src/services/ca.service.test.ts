// ===========================================
// CA Service Tests
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
  generateKeyPair: vi.fn().mockResolvedValue({
    publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----',
    privateKeyPem: '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----',
    fingerprint: 'AA:BB:CC:DD',
  }),
  encryptPrivateKey: vi.fn().mockResolvedValue({
    encrypted: 'encrypted-base64',
    salt: 'salt-hex',
    iv: 'iv-hex',
    tag: 'tag-hex',
  }),
  decryptPrivateKey: vi.fn().mockResolvedValue('-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----'),
  createSelfSignedCert: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----'),
  signCertificate: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE-----\nMOCK_SIGNED_CERT\n-----END CERTIFICATE-----'),
  generateCSR: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE REQUEST-----\nMOCK_CSR\n-----END CERTIFICATE REQUEST-----'),
  computeFingerprint: vi.fn().mockReturnValue('EE:FF:00:11'),
  parseCertificate: vi.fn().mockReturnValue({
    subject: { commonName: 'Test' },
    issuer: { commonName: 'Test' },
    serialNumber: '00000001',
    notBefore: new Date(),
    notAfter: new Date(),
    fingerprint: 'EE:FF:00:11',
    extensions: {},
    pem: '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----',
  }),
}));

vi.mock('./pki-audit.service.js', () => ({
  PkiAuditService: { log: vi.fn().mockResolvedValue({ ok: true, value: undefined }) },
  PKI_AUDIT_ACTIONS: {
    CA_CREATED: 'CA_CREATED',
    CA_UPDATED: 'CA_UPDATED',
    CA_SUSPENDED: 'CA_SUSPENDED',
    CA_RETIRED: 'CA_RETIRED',
  },
}));

import { CaService } from './ca.service.js';
import { __mocks } from '../lib/db.js';

const { mockSelect, mockUpdate } = __mocks as unknown as {
  mockSelect: ReturnType<typeof vi.fn>;
  mockInsert: ReturnType<typeof vi.fn>;
  mockUpdate: ReturnType<typeof vi.fn>;
  mockDelete: ReturnType<typeof vi.fn>;
  mockTransaction: ReturnType<typeof vi.fn>;
};

describe('CaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  describe('getById()', () => {
    it('should return CA when found', async () => {
      const mockCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test Root CA',
        commonName: 'Test Root CA',
        status: 'active',
        isRoot: true,
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCa]),
        }),
      });

      const result = await CaService.getById('10000000-0000-4000-8000-000000000001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Test Root CA');
        expect(result.value.id).toBe('10000000-0000-4000-8000-000000000001');
      }
    });

    it('should return error with CA_NOT_FOUND when not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CaService.getById('10000000-0000-4000-8000-000000000099');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  describe('list()', () => {
    it('should return paginated list of CAs', async () => {
      const caList = [
        { id: '10000000-0000-4000-8000-000000000001', name: 'Root CA', status: 'active' },
        { id: '10000000-0000-4000-8000-000000000002', name: 'Intermediate CA', status: 'active' },
      ];

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // The main query with orderBy/limit/offset
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(caList),
                  }),
                }),
              }),
            }),
          };
        }
        // The count query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        };
      });

      const result = await CaService.list({ page: 1, limit: 20 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.cas).toHaveLength(2);
        expect(result.value.total).toBe(2);
      }
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  describe('update()', () => {
    it('should update CA and return updated record', async () => {
      const existingCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Old Name',
        status: 'active',
      };
      const updatedCa = {
        ...existingCa,
        name: 'New Name',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingCa]),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedCa]),
          }),
        }),
      });

      const result = await CaService.update(
        '10000000-0000-4000-8000-000000000001',
        { name: 'New Name' },
        '10000000-0000-4000-a000-000000000001',
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('New Name');
      }
    });
  });

  // -----------------------------------------------------------------------
  // suspend
  // -----------------------------------------------------------------------

  describe('suspend()', () => {
    it('should suspend an active CA', async () => {
      const activeCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test CA',
        status: 'active',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeCa]),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...activeCa, status: 'suspended' }]),
          }),
        }),
      });

      const result = await CaService.suspend(
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-a000-000000000001',
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('suspended');
      }
    });

    it('should fail to suspend a non-active CA', async () => {
      const suspendedCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test CA',
        status: 'suspended',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([suspendedCa]),
        }),
      });

      const result = await CaService.suspend(
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-a000-000000000001',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_ACTIVE');
      }
    });
  });

  // -----------------------------------------------------------------------
  // retire
  // -----------------------------------------------------------------------

  describe('retire()', () => {
    it('should retire an active CA', async () => {
      const activeCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test CA',
        status: 'active',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([activeCa]),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...activeCa, status: 'retired' }]),
          }),
        }),
      });

      const result = await CaService.retire(
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-a000-000000000001',
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('retired');
      }
    });

    it('should retire a suspended CA', async () => {
      const suspendedCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test CA',
        status: 'suspended',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([suspendedCa]),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...suspendedCa, status: 'retired' }]),
          }),
        }),
      });

      const result = await CaService.retire(
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-a000-000000000001',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('retired');
      }
    });

    it('should fail to retire an already retired CA', async () => {
      const retiredCa = {
        id: '10000000-0000-4000-8000-000000000001',
        name: 'Test CA',
        status: 'retired',
      };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([retiredCa]),
        }),
      });

      const result = await CaService.retire(
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-a000-000000000001',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_ACTIVE');
      }
    });
  });

  // -----------------------------------------------------------------------
  // getChain
  // -----------------------------------------------------------------------

  describe('getChain()', () => {
    it('should return certificate chain from leaf to root', async () => {
      const intermediateCaId = '10000000-0000-4000-8000-000000000002';
      const rootCaId = '10000000-0000-4000-8000-000000000001';
      const intermediateCertId = '10000000-0000-4000-9000-000000000002';
      const rootCertId = '10000000-0000-4000-9000-000000000001';

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First iteration: find intermediate CA
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                certificateId: intermediateCertId,
                parentCaId: rootCaId,
              }]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // First iteration: get intermediate certificate PEM
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                certificatePem: '-----BEGIN CERTIFICATE-----\nINTERMEDIATE\n-----END CERTIFICATE-----',
              }]),
            }),
          };
        }
        if (selectCallCount === 3) {
          // Second iteration: find root CA
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                certificateId: rootCertId,
                parentCaId: null,
              }]),
            }),
          };
        }
        // Second iteration: get root certificate PEM
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              certificatePem: '-----BEGIN CERTIFICATE-----\nROOT\n-----END CERTIFICATE-----',
            }]),
          }),
        };
      });

      const result = await CaService.getChain(intermediateCaId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]).toContain('INTERMEDIATE');
        expect(result.value[1]).toContain('ROOT');
      }
    });
  });

  // -----------------------------------------------------------------------
  // incrementSerial
  // -----------------------------------------------------------------------

  describe('incrementSerial()', () => {
    it('should atomically increment serial counter', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ serialCounter: 5 }]),
          }),
        }),
      });

      const result = await CaService.incrementSerial('10000000-0000-4000-8000-000000000001');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(5);
      }
    });
  });
});
