// ===========================================
// Certificate Lifecycle Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
  signCertificate: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE-----\nMOCK_SIGNED_CERT\n-----END CERTIFICATE-----'),
  generateCSR: vi.fn().mockReturnValue('-----BEGIN CERTIFICATE REQUEST-----\nMOCK_CSR\n-----END CERTIFICATE REQUEST-----'),
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
}));

vi.mock('./pki-audit.service.js', () => ({
  PkiAuditService: { log: vi.fn().mockResolvedValue({ ok: true, value: undefined }) },
  PKI_AUDIT_ACTIONS: {
    CERT_REVOKED: 'CERT_REVOKED',
    CERT_RENEWED: 'CERT_RENEWED',
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

vi.mock('../lib/logger.js', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { CertificateLifecycleService } from './certificate-lifecycle.service.js';
import { __mocks } from '../lib/db.js';
import { decryptPrivateKey } from '../lib/pki-crypto.js';

const { mockSelect, mockInsert, mockUpdate } = __mocks as unknown as {
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
const CERT_ID = '10000000-0000-4000-8000-000000000001';
const CA_ID = '10000000-0000-4000-8000-000000000002';
const CA_CERT_ID = '10000000-0000-4000-8000-000000000003';
const PRIVATE_KEY_ID = '10000000-0000-4000-8000-000000000004';

const mockActiveCert = {
  id: CERT_ID,
  issuingCaId: CA_ID,
  serialNumber: '00000001',
  commonName: 'test.example.com',
  organization: 'Test Org',
  organizationalUnit: 'IT',
  country: 'US',
  state: 'CA',
  locality: 'San Francisco',
  sans: null,
  certificatePem: '-----BEGIN CERTIFICATE-----\nORIG\n-----END CERTIFICATE-----',
  fingerprint: 'AA:BB:CC:DD',
  notBefore: new Date(),
  notAfter: new Date(Date.now() + 365 * 86400000),
  certType: 'server',
  status: 'active',
  profileId: null,
  privateKeyId: PRIVATE_KEY_ID,
};

const mockCa = {
  id: CA_ID,
  name: 'Test CA',
  commonName: 'Test CA',
  status: 'active',
  isRoot: false,
  certificateId: CA_CERT_ID,
  privateKeyId: PRIVATE_KEY_ID,
  maxValidityDays: 365,
  serialCounter: 10,
};

const mockCaPrivateKey = {
  id: PRIVATE_KEY_ID,
  algorithm: 'rsa',
  keySize: 2048,
  curve: null,
  encryptedPrivateKeyPem: 'encrypted-pem',
  publicKeyPem: '-----BEGIN PUBLIC KEY-----\nCA_PUB\n-----END PUBLIC KEY-----',
  keyFingerprint: 'CA:FP',
  kdfSalt: 'salt',
  kdfIv: 'iv',
  kdfTag: 'tag',
};

const mockCaCert = {
  certificatePem: '-----BEGIN CERTIFICATE-----\nCA_CERT\n-----END CERTIFICATE-----',
  notAfter: new Date(Date.now() + 3650 * 86400000),
};

describe('CertificateLifecycleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // revoke
  // -----------------------------------------------------------------------

  describe('revoke()', () => {
    it('should revoke an active certificate', async () => {
      const revokedCert = { ...mockActiveCert, status: 'revoked' };

      // db.select() for fetching the cert
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockActiveCert]),
        }),
      });

      // Inside transaction: tx.insert (revocations) and tx.update (certificates)
      mockInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([revokedCert]),
          }),
        }),
      });

      const result = await CertificateLifecycleService.revoke(
        CERT_ID,
        { reason: 'keyCompromise' },
        ACTOR_ID,
        ACTOR_IP,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('revoked');
        expect(result.value.id).toBe(CERT_ID);
      }
    });

    it('should return CERT_NOT_FOUND when certificate does not exist', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateLifecycleService.revoke(
        '10000000-0000-4000-8000-000000000099',
        { reason: 'unspecified' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_FOUND');
      }
    });

    it('should return CERT_ALREADY_REVOKED when certificate is already revoked', async () => {
      const revokedCert = { ...mockActiveCert, status: 'revoked' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([revokedCert]),
        }),
      });

      const result = await CertificateLifecycleService.revoke(
        CERT_ID,
        { reason: 'unspecified' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_ALREADY_REVOKED');
      }
    });

    it('should return INVALID_INPUT when certificate status is not active', async () => {
      const expiredCert = { ...mockActiveCert, status: 'expired' };

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expiredCert]),
        }),
      });

      const result = await CertificateLifecycleService.revoke(
        CERT_ID,
        { reason: 'unspecified' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
      }
    });
  });

  // -----------------------------------------------------------------------
  // renew
  // -----------------------------------------------------------------------

  describe('renew()', () => {
    /**
     * Helper to set up the mock chain for a successful renew flow.
     * The renew method performs many sequential db.select() calls, so
     * we use mockImplementation with a call counter to return the right
     * data for each invocation.
     */
    function setupRenewMocks(opts?: {
      certOverrides?: Record<string, unknown>;
      caOverrides?: Record<string, unknown>;
      origKeyOverrides?: Record<string, unknown>;
      withProfile?: boolean;
    }) {
      const cert = { ...mockActiveCert, ...(opts?.certOverrides ?? {}) };
      const ca = { ...mockCa, ...(opts?.caOverrides ?? {}) };

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;

        // Call 1: Get the original certificate
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([cert]),
            }),
          };
        }

        // Call 2: Get the issuing CA
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([ca]),
            }),
          };
        }

        // Call 3: Get the CA private key
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCaPrivateKey]),
            }),
          };
        }

        // Call 4: Get the CA certificate PEM
        if (selectCallCount === 4) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCaCert]),
            }),
          };
        }

        // Call 5: Get the original key algorithm (only if privateKeyId is set)
        if (selectCallCount === 5 && cert.privateKeyId) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                algorithm: opts?.origKeyOverrides?.algorithm ?? 'rsa',
                keySize: opts?.origKeyOverrides?.keySize ?? 2048,
                curve: opts?.origKeyOverrides?.curve ?? null,
              }]),
            }),
          };
        }

        // Call 6 (optional): Get the profile if profileId is set
        if (opts?.withProfile) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                id: '10000000-0000-4000-8000-000000000010',
                certType: 'server',
                keyUsage: ['digitalSignature', 'keyEncipherment'],
                extKeyUsage: ['serverAuth'],
                basicConstraints: { ca: false, pathLenConstraint: undefined },
              }]),
            }),
          };
        }

        // Default fallback
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      // db.update() for incrementing serial counter
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ serialCounter: 11 }]),
          }),
        }),
      });

      // Inside transaction: tx.insert (private key), then tx.insert (certificate)
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
            returning: vi.fn().mockResolvedValue([{
              ...cert,
              id: '10000000-0000-4000-8000-000000000030',
              serialNumber: '0000000a',
              status: 'active',
              privateKeyId: '10000000-0000-4000-8000-000000000020',
            }]),
          }),
        };
      });
    }

    it('should renew a certificate and return new cert with private key and chain', async () => {
      setupRenewMocks();

      const result = await CertificateLifecycleService.renew(
        CERT_ID,
        { caPassphrase: 'test-passphrase' },
        ACTOR_ID,
        ACTOR_IP,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.certificate).toBeDefined();
        expect(result.value.certificatePem).toContain('BEGIN CERTIFICATE');
        expect(result.value.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
        expect(result.value.chainPems).toBeInstanceOf(Array);
      }
    });

    it('should return CERT_NOT_FOUND when certificate does not exist', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await CertificateLifecycleService.renew(
        '10000000-0000-4000-8000-000000000099',
        { caPassphrase: 'test-passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CERT_NOT_FOUND');
      }
    });

    it('should return CA_NOT_FOUND when issuing CA does not exist', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockActiveCert]),
            }),
          };
        }
        // CA query returns empty
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await CertificateLifecycleService.renew(
        CERT_ID,
        { caPassphrase: 'test-passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_FOUND');
      }
    });

    it('should return CA_NOT_ACTIVE when CA is not active', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockActiveCert]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ ...mockCa, status: 'suspended' }]),
          }),
        };
      });

      const result = await CertificateLifecycleService.renew(
        CERT_ID,
        { caPassphrase: 'test-passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'CA_NOT_ACTIVE');
      }
    });

    it('should return INVALID_PASSPHRASE when decryption fails', async () => {
      // Make decryptPrivateKey throw
      vi.mocked(decryptPrivateKey).mockRejectedValueOnce(new Error('Decryption failed'));

      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockActiveCert]),
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
            where: vi.fn().mockResolvedValue([mockCaPrivateKey]),
          }),
        };
      });

      const result = await CertificateLifecycleService.renew(
        CERT_ID,
        { caPassphrase: 'wrong-passphrase' },
        ACTOR_ID,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code', 'INVALID_PASSPHRASE');
      }
    });

    it('should renew with profile extensions when profileId is set', async () => {
      const certWithProfile = {
        ...mockActiveCert,
        profileId: '10000000-0000-4000-8000-000000000010',
      };

      setupRenewMocks({ certOverrides: { profileId: '10000000-0000-4000-8000-000000000010' }, withProfile: true });

      // Override the first select to return cert with profileId
      let selectCallCount = 0;
      const originalMockImpl = mockSelect.getMockImplementation()!;

      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([certWithProfile]),
            }),
          };
        }
        // For the rest, delegate to the setupRenewMocks counter
        // We need to manually handle the remaining calls
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCa]),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCaPrivateKey]),
            }),
          };
        }
        if (selectCallCount === 4) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockCaCert]),
            }),
          };
        }
        if (selectCallCount === 5) {
          // Original key
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                algorithm: 'rsa',
                keySize: 2048,
                curve: null,
              }]),
            }),
          };
        }
        if (selectCallCount === 6) {
          // Profile lookup
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{
                id: '10000000-0000-4000-8000-000000000010',
                certType: 'server',
                keyUsage: ['digitalSignature', 'keyEncipherment'],
                extKeyUsage: ['serverAuth'],
                basicConstraints: { ca: false, pathLenConstraint: undefined },
              }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      // Re-setup insert and update mocks since setupRenewMocks may have been overridden
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ serialCounter: 11 }]),
          }),
        }),
      });

      let insertCallCount = 0;
      mockInsert.mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 1) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000020' }]),
            }),
          };
        }
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              ...certWithProfile,
              id: '10000000-0000-4000-8000-000000000030',
              serialNumber: '0000000a',
              status: 'active',
            }]),
          }),
        };
      });

      const result = await CertificateLifecycleService.renew(
        CERT_ID,
        { caPassphrase: 'test-passphrase' },
        ACTOR_ID,
        ACTOR_IP,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.certificate).toBeDefined();
      }
    });

    it('should use custom validityDays when provided', async () => {
      setupRenewMocks();

      const result = await CertificateLifecycleService.renew(
        CERT_ID,
        { caPassphrase: 'test-passphrase', validityDays: 90 },
        ACTOR_ID,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.certificate).toBeDefined();
      }
    });
  });
});
