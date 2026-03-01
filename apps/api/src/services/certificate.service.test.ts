// ===========================================
// Certificate Service Tests
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
  generateCSR: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE REQUEST-----\nMOCK_CSR\n-----END CERTIFICATE REQUEST-----'),
  signCertificate: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE-----\nMOCK_SIGNED_CERT\n-----END CERTIFICATE-----'),
  parseCertificate: vi.fn().mockReturnValue({
    subject: { commonName: 'Test' },
    issuer: { commonName: 'Test CA' },
    serialNumber: '00000001',
    notBefore: new Date(),
    notAfter: new Date(),
    fingerprint: 'EE:FF:00:11',
    extensions: {},
    pem: '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----',
  }),
  computeFingerprint: vi.fn().mockReturnValue('EE:FF:00:11'),
  exportPKCS12: vi.fn().mockReturnValue(Buffer.from('mock-p12')),
}));

vi.mock('./pki-audit.service.js', () => ({
  PkiAuditService: { log: vi.fn().mockResolvedValue({ ok: true, value: undefined }) },
  PKI_AUDIT_ACTIONS: {
    CERT_ISSUED: 'CERT_ISSUED',
    CERT_DOWNLOADED: 'CERT_DOWNLOADED',
  },
}));

vi.mock('./ca.service.js', () => ({
  CaService: {
    getChain: vi.fn().mockResolvedValue({
      ok: true,
      value: ['-----BEGIN CERTIFICATE-----\nCA_CERT\n-----END CERTIFICATE-----'],
    }),
  },
}));

vi.mock('./certificate-profile.service.js', () => ({
  CertificateProfileService: {
    validateAgainstProfile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { CertificateService } from './certificate.service.js';
import { __mocks } from '../lib/db.js';

const { mockSelect, mockInsert, mockUpdate } = __mocks as unknown as {
  mockSelect: ReturnType<typeof vi.fn>;
  mockInsert: ReturnType<typeof vi.fn>;
  mockUpdate: ReturnType<typeof vi.fn>;
  mockDelete: ReturnType<typeof vi.fn>;
  mockTransaction: ReturnType<typeof vi.fn>;
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const CA_ID = '10000000-0000-4000-8000-000000000001';
const CERT_ID = '10000000-0000-4000-8000-000000000002';
const ACTOR_ID = '10000000-0000-4000-a000-000000000001';
const PRIVATE_KEY_ID = '10000000-0000-4000-8000-000000000003';
const CA_CERT_ID = '10000000-0000-4000-8000-000000000004';
const PROFILE_ID = '10000000-0000-4000-8000-000000000005';

const futureDate = new Date();
futureDate.setFullYear(futureDate.getFullYear() + 10);

const mockCa = {
  id: CA_ID,
  name: 'Test CA',
  commonName: 'Test CA',
  status: 'active',
  isRoot: true,
  privateKeyId: PRIVATE_KEY_ID,
  certificateId: CA_CERT_ID,
  serialCounter: 1,
};

const mockPrivateKey = {
  id: PRIVATE_KEY_ID,
  encryptedPrivateKeyPem: 'encrypted-pem',
  kdfSalt: 'salt',
  kdfIv: 'iv',
  kdfTag: 'tag',
};

const mockCaCertPem = '-----BEGIN CERTIFICATE-----\nCA_CERT_PEM\n-----END CERTIFICATE-----';

const mockCertificate = {
  id: CERT_ID,
  issuingCaId: CA_ID,
  serialNumber: '00000001',
  commonName: 'test.example.com',
  organization: null,
  certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
  fingerprint: 'EE:FF:00:11',
  notBefore: new Date(),
  notAfter: futureDate,
  certType: 'server',
  status: 'active',
  profileId: null,
  privateKeyId: PRIVATE_KEY_ID,
  createdAt: new Date(),
};

describe('CertificateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  describe('getById()', () => {
    it('should return certificate when found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCertificate]),
        }),
      });

      const result = await CertificateService.getById(CERT_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(CERT_ID);
        expect(result.value.commonName).toBe('test.example.com');
      }
    });

    it('should return error when certificate not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateService.getById(CERT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  describe('list()', () => {
    it('should return paginated list of certificates', async () => {
      const certList = [
        { ...mockCertificate, id: '10000000-0000-4000-8000-000000000010' },
        { ...mockCertificate, id: '10000000-0000-4000-8000-000000000011' },
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
                    offset: vi.fn().mockResolvedValue(certList),
                  }),
                }),
              }),
            }),
          };
        }
        // Count query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        };
      });

      const result = await CertificateService.list({ page: 1, limit: 20 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.certificates).toHaveLength(2);
        expect(result.value.total).toBe(2);
      }
    });

    it('should apply filters when provided', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockCertificate]),
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

      const result = await CertificateService.list({
        page: 1,
        limit: 10,
        caId: CA_ID,
        status: 'active',
        certType: 'server',
        search: 'test',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.certificates).toHaveLength(1);
        expect(result.value.total).toBe(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // getChain
  // -----------------------------------------------------------------------

  describe('getChain()', () => {
    it('should return certificate chain', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ issuingCaId: CA_ID }]),
        }),
      });

      const result = await CertificateService.getChain(CERT_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toContain('CA_CERT');
      }
    });

    it('should return error when certificate not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateService.getChain(CERT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // download
  // -----------------------------------------------------------------------

  describe('download()', () => {
    it('should download certificate in PEM format', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCertificate]),
        }),
      });

      const result = await CertificateService.download(
        CERT_ID,
        { format: 'pem', includeChain: false },
        ACTOR_ID,
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contentType).toBe('application/x-pem-file');
        expect(result.value.filename).toContain('.pem');
        expect(typeof result.value.data).toBe('string');
      }
    });

    it('should download certificate in PEM format with chain', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCertificate]),
        }),
      });

      const result = await CertificateService.download(
        CERT_ID,
        { format: 'pem', includeChain: true },
        ACTOR_ID,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contentType).toBe('application/x-pem-file');
        // Should contain both certificate and chain
        expect(result.value.data).toContain('MOCK_CERT');
        expect(result.value.data).toContain('CA_CERT');
      }
    });

    it('should download certificate in DER format', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCertificate]),
        }),
      });

      const result = await CertificateService.download(
        CERT_ID,
        { format: 'der', includeChain: false },
        ACTOR_ID,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contentType).toBe('application/x-x509-ca-cert');
        expect(result.value.filename).toContain('.der');
        expect(Buffer.isBuffer(result.value.data)).toBe(true);
      }
    });

    it('should download certificate in PKCS12 format', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Fetch certificate
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCertificate]),
            }),
          };
        }
        // Fetch private key
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPrivateKey]),
          }),
        };
      });

      const result = await CertificateService.download(
        CERT_ID,
        { format: 'pkcs12', password: 'test-password', includeChain: false },
        ACTOR_ID,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.contentType).toBe('application/x-pkcs12');
        expect(result.value.filename).toContain('.p12');
        expect(Buffer.isBuffer(result.value.data)).toBe(true);
      }
    });

    it('should fail PKCS12 when no private key ID', async () => {
      const certWithoutKey = { ...mockCertificate, privateKeyId: null };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([certWithoutKey]),
        }),
      });

      const result = await CertificateService.download(
        CERT_ID,
        { format: 'pkcs12', password: 'test', includeChain: false },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_FOUND');
      }
    });

    it('should fail PKCS12 without password', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCertificate]),
        }),
      });

      const result = await CertificateService.download(
        CERT_ID,
        { format: 'pkcs12', includeChain: false },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
      }
    });

    it('should return error when certificate not found for download', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateService.download(
        CERT_ID,
        { format: 'pem', includeChain: false },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_FOUND');
      }
    });
  });

  // -----------------------------------------------------------------------
  // issueDirect
  // -----------------------------------------------------------------------

  describe('issueDirect()', () => {
    it('should issue a certificate successfully', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Fetch CA
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Fetch CA private key
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockPrivateKey]),
            }),
          };
        }
        if (selectCallCount === 3) {
          // Fetch CA certificate PEM
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ certificatePem: mockCaCertPem }]),
            }),
          };
        }
        // Fetch CA cert notAfter (for validity clamping)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ notAfter: futureDate }]),
          }),
        };
      });

      // Update serial counter
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ serialCounter: 2 }]),
          }),
        }),
      });

      // Transaction inserts (private key + certificate)
      // The transaction mock calls cb with the same select/insert/update/delete mocks.
      // Inside the transaction, insert is called twice:
      // 1. Insert private key
      // 2. Insert certificate
      let insertCallCount = 0;
      mockInsert.mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 1) {
          // Insert private key
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000020' }]),
            }),
          };
        }
        // Insert certificate
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCertificate]),
          }),
        };
      });

      const result = await CertificateService.issueDirect(
        {
          caId: CA_ID,
          caPassphrase: 'test-passphrase',
          commonName: 'test.example.com',
          keyAlgorithm: 'rsa',
          keySize: 2048,
          validityDays: 365,
        },
        ACTOR_ID,
        '127.0.0.1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.certificate.id).toBe(CERT_ID);
        expect(result.value.certificatePem).toContain('MOCK_SIGNED_CERT');
        expect(result.value.privateKeyPem).toContain('MOCK');
        expect(result.value.chainPems).toHaveLength(1);
      }
    });

    it('should fail when CA is not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateService.issueDirect(
        {
          caId: CA_ID,
          caPassphrase: 'test-passphrase',
          commonName: 'test.example.com',
          keyAlgorithm: 'rsa',
          keySize: 2048,
          validityDays: 365,
        },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_FOUND');
      }
    });

    it('should fail when CA is not active', async () => {
      const inactiveCa = { ...mockCa, status: 'retired' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([inactiveCa]),
        }),
      });

      const result = await CertificateService.issueDirect(
        {
          caId: CA_ID,
          caPassphrase: 'test-passphrase',
          commonName: 'test.example.com',
          keyAlgorithm: 'rsa',
          keySize: 2048,
          validityDays: 365,
        },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_ACTIVE');
      }
    });
  });
});
