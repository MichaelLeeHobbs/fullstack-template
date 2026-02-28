// ===========================================
// Certificate Lifecycle Service
// ===========================================
// Handles certificate revocation and renewal operations.
// Separated from CertificateService to keep issuance and
// lifecycle management in distinct modules.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import {
  certificates, type Certificate, CERT_STATUSES,
  certificateAuthorities, CA_STATUSES,
  certificateProfiles,
  pkiPrivateKeys,
  revocations,
} from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import {
  decryptPrivateKey, signCertificate, parseCertificate,
  generateKeyPair, encryptPrivateKey, generateCSR,
  type CertificateExtensions, type SubjectFields,
} from '../lib/pki-crypto.js';
import { randomBytes } from 'crypto';
import { CaService } from './ca.service.js';
import { PkiAuditService, PKI_AUDIT_ACTIONS } from './pki-audit.service.js';
import type { RevokeCertificateInput, RenewCertificateInput } from '../schemas/revocation.schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a serial number as a zero-padded hex string (8 chars minimum).
 */
function formatSerial(serial: number): string {
  return serial.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CertificateLifecycleService {
  /**
   * Revoke an active certificate.
   *
   * Creates a revocation record and updates the certificate status.
   */
  static async revoke(
    id: string,
    input: RevokeCertificateInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<Certificate>> {
    return tryCatch(async () => {
      // 1. Get the certificate
      const [cert] = await db
        .select()
        .from(certificates)
        .where(eq(certificates.id, id));

      if (!cert) {
        throw new ServiceError('CERT_NOT_FOUND', 'Certificate not found');
      }

      if (cert.status === CERT_STATUSES.REVOKED) {
        throw new ServiceError('CERT_ALREADY_REVOKED', 'Certificate is already revoked');
      }

      if (cert.status !== CERT_STATUSES.ACTIVE) {
        throw new ServiceError('INVALID_INPUT', `Cannot revoke a certificate with status '${cert.status}'`);
      }

      // 2. Transaction: insert revocation + update certificate status
      const updated = await db.transaction(async (tx) => {
        await tx
          .insert(revocations)
          .values({
            certificateId: id,
            reason: input.reason,
            revokedBy: actorId,
            invalidityDate: input.invalidityDate ? new Date(input.invalidityDate) : null,
          });

        const [updatedCert] = await tx
          .update(certificates)
          .set({ status: CERT_STATUSES.REVOKED })
          .where(eq(certificates.id, id))
          .returning();

        if (!updatedCert) {
          throw new Error('Failed to update certificate status');
        }

        return updatedCert;
      });

      // 3. Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CERT_REVOKED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate',
        targetId: id,
        details: {
          commonName: cert.commonName,
          reason: input.reason,
          serialNumber: cert.serialNumber,
          issuingCaId: cert.issuingCaId,
        },
      }).catch(() => {});

      return updated;
    });
  }

  /**
   * Renew an existing certificate.
   *
   * Generates a new key pair, signs a new certificate with the same CA,
   * and returns the new certificate with its private key and chain.
   */
  static async renew(
    id: string,
    input: RenewCertificateInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<{
    certificate: Certificate;
    certificatePem: string;
    privateKeyPem: string;
    chainPems: string[];
  }>> {
    return tryCatch(async () => {
      // 1. Get the original certificate
      const [originalCert] = await db
        .select()
        .from(certificates)
        .where(eq(certificates.id, id));

      if (!originalCert) {
        throw new ServiceError('CERT_NOT_FOUND', 'Certificate not found');
      }

      // 2. Get the issuing CA and verify it is active
      const [ca] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, originalCert.issuingCaId));

      if (!ca) {
        throw new ServiceError('CA_NOT_FOUND', 'Issuing certificate authority not found');
      }

      if (ca.status !== CA_STATUSES.ACTIVE) {
        throw new ServiceError('CA_NOT_ACTIVE', 'Issuing certificate authority is not active');
      }

      // 3. Decrypt CA private key
      const [caPrivateKey] = await db
        .select()
        .from(pkiPrivateKeys)
        .where(eq(pkiPrivateKeys.id, ca.privateKeyId));

      if (!caPrivateKey) {
        throw new Error('CA private key not found');
      }

      let caKeyPem: string;
      try {
        caKeyPem = await decryptPrivateKey(
          caPrivateKey.encryptedPrivateKeyPem,
          input.caPassphrase,
          caPrivateKey.kdfSalt,
          caPrivateKey.kdfIv,
          caPrivateKey.kdfTag,
        );
      } catch {
        throw new ServiceError('INVALID_PASSPHRASE', 'Failed to decrypt CA private key — incorrect passphrase');
      }

      // 4. Get CA certificate PEM
      if (!ca.certificateId) {
        throw new Error('CA does not have an associated certificate');
      }

      const [caCert] = await db
        .select({ certificatePem: certificates.certificatePem, notAfter: certificates.notAfter })
        .from(certificates)
        .where(eq(certificates.id, ca.certificateId));

      if (!caCert) {
        throw new Error('CA certificate not found');
      }

      // 5. Generate a new key pair
      // Determine the key algorithm from the original cert's private key, or default to RSA
      let keyAlgorithm: 'rsa' | 'ecdsa' = 'rsa';
      let keySize: number | undefined = 2048;
      let keyCurve: string | undefined;

      if (originalCert.privateKeyId) {
        const [origKey] = await db
          .select({ algorithm: pkiPrivateKeys.algorithm, keySize: pkiPrivateKeys.keySize, curve: pkiPrivateKeys.curve })
          .from(pkiPrivateKeys)
          .where(eq(pkiPrivateKeys.id, originalCert.privateKeyId));

        if (origKey) {
          keyAlgorithm = origKey.algorithm as 'rsa' | 'ecdsa';
          keySize = origKey.keySize ?? undefined;
          keyCurve = origKey.curve ?? undefined;
        }
      }

      const keyPair = await generateKeyPair(keyAlgorithm, keySize, keyCurve);

      // Encrypt private key with a generated passphrase for storage
      const storagePassphrase = randomBytes(32).toString('hex');
      const encryptedKey = await encryptPrivateKey(keyPair.privateKeyPem, storagePassphrase);

      // 6. Build subject from original certificate
      const subject: SubjectFields = {
        commonName: originalCert.commonName,
        organization: originalCert.organization ?? undefined,
        organizationalUnit: originalCert.organizationalUnit ?? undefined,
        country: originalCert.country ?? undefined,
        state: originalCert.state ?? undefined,
        locality: originalCert.locality ?? undefined,
      };

      // 7. Generate CSR
      const csrPem = generateCSR(keyPair.privateKeyPem, subject);

      // 8. Increment CA serial counter
      const [serialResult] = await db
        .update(certificateAuthorities)
        .set({ serialCounter: sql`${certificateAuthorities.serialCounter} + 1` })
        .where(eq(certificateAuthorities.id, ca.id))
        .returning({ serialCounter: certificateAuthorities.serialCounter });

      if (!serialResult) {
        throw new Error('Failed to increment CA serial counter');
      }

      const serial = formatSerial(serialResult.serialCounter - 1);

      // 9. Compute validity dates
      const validityDays = input.validityDays ?? ca.maxValidityDays;

      const notBefore = new Date();
      const requestedNotAfter = new Date();
      requestedNotAfter.setDate(requestedNotAfter.getDate() + validityDays);

      const caNotAfter = caCert.notAfter ?? requestedNotAfter;
      const notAfter = requestedNotAfter < caNotAfter ? requestedNotAfter : caNotAfter;

      // 10. Build extensions from profile or defaults
      const extensions: CertificateExtensions = {};
      let certType = originalCert.certType;

      if (originalCert.profileId) {
        const [profile] = await db
          .select()
          .from(certificateProfiles)
          .where(eq(certificateProfiles.id, originalCert.profileId));

        if (profile) {
          certType = profile.certType;
          extensions.keyUsage = profile.keyUsage;
          extensions.extKeyUsage = profile.extKeyUsage.length > 0 ? profile.extKeyUsage : undefined;
          if (profile.basicConstraints) {
            extensions.basicConstraints = {
              cA: profile.basicConstraints.ca,
              pathLenConstraint: profile.basicConstraints.pathLenConstraint,
            };
          }
        }
      }

      if (!extensions.keyUsage) {
        // Default extensions for end-entity certificates
        extensions.keyUsage = ['digitalSignature', 'keyEncipherment'];
        extensions.basicConstraints = { cA: false };
      }

      // 11. Sign the new certificate
      const certPem = signCertificate(
        caCert.certificatePem,
        caKeyPem,
        csrPem,
        serial,
        extensions,
        notBefore,
        notAfter,
      );

      // Parse cert for fingerprint
      const certParsed = parseCertificate(certPem);

      // 12. Transaction: insert private key + insert certificate
      const certificate = await db.transaction(async (tx) => {
        // Insert private key
        const [privateKey] = await tx
          .insert(pkiPrivateKeys)
          .values({
            algorithm: keyAlgorithm,
            keySize: keySize ?? null,
            curve: keyCurve ?? null,
            encryptedPrivateKeyPem: encryptedKey.encrypted,
            publicKeyPem: keyPair.publicKeyPem,
            keyFingerprint: keyPair.fingerprint,
            kdfSalt: encryptedKey.salt,
            kdfIv: encryptedKey.iv,
            kdfTag: encryptedKey.tag,
          })
          .returning({ id: pkiPrivateKeys.id });

        if (!privateKey) {
          throw new Error('Failed to insert private key');
        }

        // Insert the new certificate
        const [cert] = await tx
          .insert(certificates)
          .values({
            issuingCaId: ca.id,
            serialNumber: serial,
            commonName: originalCert.commonName,
            organization: originalCert.organization ?? null,
            organizationalUnit: originalCert.organizationalUnit ?? null,
            country: originalCert.country ?? null,
            state: originalCert.state ?? null,
            locality: originalCert.locality ?? null,
            sans: originalCert.sans ?? null,
            certificatePem: certPem,
            fingerprint: certParsed.fingerprint,
            notBefore,
            notAfter,
            certType,
            status: CERT_STATUSES.ACTIVE,
            profileId: originalCert.profileId ?? null,
            privateKeyId: privateKey.id,
          })
          .returning();

        if (!cert) {
          throw new Error('Failed to insert certificate');
        }

        return cert;
      });

      // 13. Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CERT_RENEWED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate',
        targetId: certificate.id,
        details: {
          originalCertificateId: id,
          commonName: originalCert.commonName,
          caId: ca.id,
          certType,
          keyAlgorithm,
        },
      }).catch(() => {});

      // 14. Get chain PEMs
      const chainResult = await CaService.getChain(ca.id);
      const chainPems = chainResult.ok ? chainResult.value : [];

      return {
        certificate,
        certificatePem: certPem,
        privateKeyPem: keyPair.privateKeyPem,
        chainPems,
      };
    });
  }
}
