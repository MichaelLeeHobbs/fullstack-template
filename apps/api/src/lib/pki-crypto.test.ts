// ===========================================
// PKI Crypto Library Tests
// ===========================================
// Pure crypto tests — no mocks. Tests actual key generation,
// encryption, certificate signing, CSR, chain verification, etc.

import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  verifyPassphrase,
  computeFingerprint,
  createSelfSignedCert,
  signCertificate,
  generateCSR,
  parseCertificate,
  parseCSR,
  verifyChain,
  signCRL,
  exportPKCS12,
  type SubjectFields,
  type CertificateExtensions,
} from './pki-crypto.js';

const TEST_SUBJECT: SubjectFields = {
  commonName: 'Test Root CA',
  organization: 'Test Org',
  organizationalUnit: 'Test Unit',
  country: 'US',
  state: 'California',
  locality: 'San Francisco',
};

const CA_EXTENSIONS: CertificateExtensions = {
  basicConstraints: { cA: true, pathLenConstraint: 1 },
  keyUsage: ['keyCertSign', 'cRLSign'],
};

const SERVER_EXTENSIONS: CertificateExtensions = {
  keyUsage: ['digitalSignature', 'keyEncipherment'],
  extKeyUsage: ['serverAuth'],
  subjectAltNames: [{ type: 2, value: 'example.com' }],
};

const PASSPHRASE = 'test-passphrase-for-key-encryption';

describe('pki-crypto', () => {
  // ===========================
  // Key Generation
  // ===========================
  describe('generateKeyPair', () => {
    it('should generate RSA 2048 key pair', async () => {
      const result = await generateKeyPair('rsa', 2048);

      expect(result.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.privateKeyPem).toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(result.fingerprint).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2})+$/);
    }, 30000);

    it('should generate RSA 4096 key pair', async () => {
      const result = await generateKeyPair('rsa', 4096);

      expect(result.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.privateKeyPem).toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(result.fingerprint).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2})+$/);
    }, 60000);

    it('should generate ECDSA P-256 key pair', async () => {
      const result = await generateKeyPair('ecdsa', undefined, 'P-256');

      expect(result.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
      expect(result.fingerprint).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2})+$/);
    });

    it('should generate ECDSA P-384 key pair', async () => {
      const result = await generateKeyPair('ecdsa', undefined, 'P-384');

      expect(result.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
      expect(result.fingerprint).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2})+$/);
    });

    it('should produce different keys each time', async () => {
      const [key1, key2] = await Promise.all([
        generateKeyPair('rsa', 2048),
        generateKeyPair('rsa', 2048),
      ]);

      expect(key1.fingerprint).not.toBe(key2.fingerprint);
      expect(key1.publicKeyPem).not.toBe(key2.publicKeyPem);
    }, 30000);
  });

  // ===========================
  // Key Encryption/Decryption
  // ===========================
  describe('encryptPrivateKey / decryptPrivateKey', () => {
    it('should encrypt and decrypt RSA private key round-trip', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);

      const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, PASSPHRASE);
      expect(encrypted.encrypted).toBeTruthy();
      expect(encrypted.salt).toMatch(/^[a-f0-9]+$/);
      expect(encrypted.iv).toMatch(/^[a-f0-9]+$/);
      expect(encrypted.tag).toMatch(/^[a-f0-9]+$/);

      const decrypted = await decryptPrivateKey(
        encrypted.encrypted,
        PASSPHRASE,
        encrypted.salt,
        encrypted.iv,
        encrypted.tag,
      );

      expect(decrypted).toBe(keyPair.privateKeyPem);
    }, 30000);

    it('should encrypt and decrypt ECDSA private key round-trip', async () => {
      const keyPair = await generateKeyPair('ecdsa', undefined, 'P-256');

      const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, PASSPHRASE);
      const decrypted = await decryptPrivateKey(
        encrypted.encrypted,
        PASSPHRASE,
        encrypted.salt,
        encrypted.iv,
        encrypted.tag,
      );

      expect(decrypted).toBe(keyPair.privateKeyPem);
    });

    it('should fail to decrypt with wrong passphrase', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, PASSPHRASE);

      await expect(
        decryptPrivateKey(
          encrypted.encrypted,
          'wrong-passphrase',
          encrypted.salt,
          encrypted.iv,
          encrypted.tag,
        ),
      ).rejects.toThrow();
    }, 30000);
  });

  // ===========================
  // Passphrase Verification
  // ===========================
  describe('verifyPassphrase', () => {
    it('should return true for correct passphrase', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, PASSPHRASE);

      const valid = await verifyPassphrase(
        encrypted.encrypted,
        PASSPHRASE,
        encrypted.salt,
        encrypted.iv,
        encrypted.tag,
        keyPair.fingerprint,
      );

      expect(valid).toBe(true);
    }, 30000);

    it('should return false for wrong passphrase', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, PASSPHRASE);

      const valid = await verifyPassphrase(
        encrypted.encrypted,
        'wrong-passphrase',
        encrypted.salt,
        encrypted.iv,
        encrypted.tag,
        keyPair.fingerprint,
      );

      expect(valid).toBe(false);
    }, 30000);

    it('should return false for wrong fingerprint', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, PASSPHRASE);

      const valid = await verifyPassphrase(
        encrypted.encrypted,
        PASSPHRASE,
        encrypted.salt,
        encrypted.iv,
        encrypted.tag,
        'AA:BB:CC:DD',
      );

      expect(valid).toBe(false);
    }, 30000);
  });

  // ===========================
  // Fingerprint
  // ===========================
  describe('computeFingerprint', () => {
    it('should produce consistent fingerprint for same key', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const fp1 = computeFingerprint(keyPair.publicKeyPem);
      const fp2 = computeFingerprint(keyPair.publicKeyPem);

      expect(fp1).toBe(fp2);
    }, 30000);

    it('should produce colon-separated uppercase hex', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const fp = computeFingerprint(keyPair.publicKeyPem);

      // SHA-256 = 32 bytes = 64 hex chars = 32 groups of 2, separated by colons
      expect(fp).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2}){31}$/);
    }, 30000);
  });

  // ===========================
  // Self-Signed Certificate
  // ===========================
  describe('createSelfSignedCert', () => {
    it('should create a valid self-signed certificate', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const certPem = createSelfSignedCert(
        keyPair.privateKeyPem,
        TEST_SUBJECT,
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      expect(certPem).toContain('-----BEGIN CERTIFICATE-----');

      const parsed = parseCertificate(certPem);
      expect(parsed.subject.commonName).toBe('Test Root CA');
      expect(parsed.issuer.commonName).toBe('Test Root CA'); // self-signed
      expect(parsed.serialNumber).toBe('01');
    }, 30000);
  });

  // ===========================
  // CSR Generation & Parsing
  // ===========================
  describe('generateCSR / parseCSR', () => {
    it('should generate and parse a CSR', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);

      const csrPem = generateCSR(keyPair.privateKeyPem, {
        commonName: 'example.com',
        organization: 'Example Inc',
      });

      expect(csrPem).toContain('-----BEGIN CERTIFICATE REQUEST-----');

      const parsed = parseCSR(csrPem);
      expect(parsed.subject.commonName).toBe('example.com');
      expect(parsed.subject.organization).toBe('Example Inc');
      expect(parsed.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    }, 30000);
  });

  // ===========================
  // Certificate Signing
  // ===========================
  describe('signCertificate', () => {
    it('should sign a CSR with a CA certificate', async () => {
      // Create CA
      const caKeyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const caCertPem = createSelfSignedCert(
        caKeyPair.privateKeyPem,
        TEST_SUBJECT,
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      // Create CSR for server cert
      const serverKeyPair = await generateKeyPair('rsa', 2048);
      const csrPem = generateCSR(serverKeyPair.privateKeyPem, {
        commonName: 'server.example.com',
      }, SERVER_EXTENSIONS);

      // Sign
      const certPem = signCertificate(
        caCertPem,
        caKeyPair.privateKeyPem,
        csrPem,
        '02',
        SERVER_EXTENSIONS,
        now,
        later,
      );

      expect(certPem).toContain('-----BEGIN CERTIFICATE-----');

      const parsed = parseCertificate(certPem);
      expect(parsed.subject.commonName).toBe('server.example.com');
      expect(parsed.issuer.commonName).toBe('Test Root CA');
      expect(parsed.serialNumber).toBe('02');
    }, 60000);
  });

  // ===========================
  // Certificate Parsing
  // ===========================
  describe('parseCertificate', () => {
    it('should parse all fields from a certificate', async () => {
      const keyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const certPem = createSelfSignedCert(
        keyPair.privateKeyPem,
        TEST_SUBJECT,
        'AB',
        now,
        later,
        CA_EXTENSIONS,
      );

      const parsed = parseCertificate(certPem);

      expect(parsed.subject.commonName).toBe('Test Root CA');
      expect(parsed.subject.organization).toBe('Test Org');
      expect(parsed.subject.country).toBe('US');
      expect(parsed.fingerprint).toMatch(/^[A-F0-9]{2}(:[A-F0-9]{2}){31}$/);
      expect(parsed.pem).toBe(certPem);
      expect(parsed.notBefore).toBeInstanceOf(Date);
      expect(parsed.notAfter).toBeInstanceOf(Date);
    }, 30000);
  });

  // ===========================
  // Chain Verification
  // ===========================
  describe('verifyChain', () => {
    it('should verify a cert signed by a CA', async () => {
      const caKeyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const caCertPem = createSelfSignedCert(
        caKeyPair.privateKeyPem,
        TEST_SUBJECT,
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      const serverKeyPair = await generateKeyPair('rsa', 2048);
      const csrPem = generateCSR(serverKeyPair.privateKeyPem, {
        commonName: 'verified.example.com',
      });

      const certPem = signCertificate(
        caCertPem,
        caKeyPair.privateKeyPem,
        csrPem,
        '02',
        SERVER_EXTENSIONS,
        now,
        later,
      );

      const valid = verifyChain(certPem, [caCertPem]);
      expect(valid).toBe(true);
    }, 60000);

    it('should fail verification with wrong CA', async () => {
      // Create CA and cert
      const caKeyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const caCertPem = createSelfSignedCert(
        caKeyPair.privateKeyPem,
        TEST_SUBJECT,
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      const serverKeyPair = await generateKeyPair('rsa', 2048);
      const csrPem = generateCSR(serverKeyPair.privateKeyPem, {
        commonName: 'verified.example.com',
      });

      const certPem = signCertificate(
        caCertPem,
        caKeyPair.privateKeyPem,
        csrPem,
        '02',
        SERVER_EXTENSIONS,
        now,
        later,
      );

      // Create a different CA
      const otherCaKeyPair = await generateKeyPair('rsa', 2048);
      const otherCaCertPem = createSelfSignedCert(
        otherCaKeyPair.privateKeyPem,
        { commonName: 'Other CA' },
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      const valid = verifyChain(certPem, [otherCaCertPem]);
      expect(valid).toBe(false);
    }, 60000);
  });

  // ===========================
  // CRL Signing
  // ===========================
  describe('signCRL', () => {
    it('should create a signed CRL', async () => {
      const caKeyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const caCertPem = createSelfSignedCert(
        caKeyPair.privateKeyPem,
        TEST_SUBJECT,
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      const nextUpdate = new Date(now);
      nextUpdate.setDate(nextUpdate.getDate() + 7);

      const crlPem = signCRL(
        caCertPem,
        caKeyPair.privateKeyPem,
        [
          { serial: '02', date: now, reason: 'keyCompromise' },
          { serial: '03', date: now },
        ],
        1,
        now,
        nextUpdate,
      );

      expect(crlPem).toContain('-----BEGIN X509 CRL-----');
    }, 30000);

    it('should create an empty CRL', async () => {
      const caKeyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const caCertPem = createSelfSignedCert(
        caKeyPair.privateKeyPem,
        TEST_SUBJECT,
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      const nextUpdate = new Date(now);
      nextUpdate.setDate(nextUpdate.getDate() + 7);

      const crlPem = signCRL(
        caCertPem,
        caKeyPair.privateKeyPem,
        [],
        1,
        now,
        nextUpdate,
      );

      expect(crlPem).toContain('-----BEGIN X509 CRL-----');
    }, 30000);
  });

  // ===========================
  // PKCS#12 Export
  // ===========================
  describe('exportPKCS12', () => {
    it('should create a PKCS#12 bundle', async () => {
      const caKeyPair = await generateKeyPair('rsa', 2048);
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(later.getFullYear() + 10);

      const caCertPem = createSelfSignedCert(
        caKeyPair.privateKeyPem,
        TEST_SUBJECT,
        '01',
        now,
        later,
        CA_EXTENSIONS,
      );

      const serverKeyPair = await generateKeyPair('rsa', 2048);
      const csrPem = generateCSR(serverKeyPair.privateKeyPem, {
        commonName: 'export.example.com',
      });

      const certPem = signCertificate(
        caCertPem,
        caKeyPair.privateKeyPem,
        csrPem,
        '02',
        SERVER_EXTENSIONS,
        now,
        later,
      );

      const p12Buffer = exportPKCS12(
        certPem,
        serverKeyPair.privateKeyPem,
        [caCertPem],
        'export-password',
      );

      expect(p12Buffer).toBeInstanceOf(Buffer);
      expect(p12Buffer.length).toBeGreaterThan(0);
    }, 60000);
  });
});
