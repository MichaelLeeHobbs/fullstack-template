// ===========================================
// CA Service
// ===========================================
// Manages Certificate Authority lifecycle: creation (root & intermediate),
// listing, hierarchy, updates, suspension, retirement, and chain retrieval.
// All methods return Result<T> using tryCatch from stderr-lib.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import {
  certificateAuthorities, type CertificateAuthority, CA_STATUSES,
  pkiPrivateKeys,
  certificates, CERT_STATUSES,
} from '../db/schema/index.js';
import { eq, and, desc, sql, isNull, type SQL, asc } from 'drizzle-orm';
import {
  generateKeyPair, encryptPrivateKey, decryptPrivateKey,
  createSelfSignedCert, signCertificate, generateCSR,
  computeFingerprint, parseCertificate,
  type SubjectFields, type CertificateExtensions,
} from '../lib/pki-crypto.js';
import { PkiAuditService, PKI_AUDIT_ACTIONS } from './pki-audit.service.js';
import type { CreateCaInput, UpdateCaInput, ListCaQuery } from '../schemas/ca.schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build SubjectFields from CA creation input.
 */
function buildSubject(input: CreateCaInput): SubjectFields {
  return {
    commonName: input.commonName,
    organization: input.organization,
    organizationalUnit: input.organizationalUnit,
    country: input.country,
    state: input.state,
    locality: input.locality,
  };
}

/**
 * Format a serial number as a zero-padded hex string (8 chars minimum).
 */
function formatSerial(serial: number): string {
  return serial.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CaService {
  /**
   * Create a root Certificate Authority (self-signed).
   */
  static async createRootCA(
    input: CreateCaInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateAuthority>> {
    return tryCatch(async () => {
      // Root CAs must not have a parent
      if (input.parentCaId) {
        throw new ServiceError('INVALID_INPUT', 'Root CA must not have a parentCaId');
      }

      // Generate key pair
      const keyPair = await generateKeyPair(input.keyAlgorithm, input.keySize, input.keyCurve);

      // Encrypt private key with passphrase
      const encryptedKey = await encryptPrivateKey(keyPair.privateKeyPem, input.passphrase);

      // Compute validity window
      const notBefore = new Date();
      const notAfter = new Date();
      notAfter.setDate(notAfter.getDate() + input.maxValidityDays);

      // Build subject
      const subject = buildSubject(input);

      // Serial 1 is used for the CA's own certificate
      const serial = formatSerial(1);

      // Create self-signed certificate with CA extensions
      const extensions: CertificateExtensions = {
        basicConstraints: {
          cA: true,
          pathLenConstraint: input.pathLenConstraint,
        },
        keyUsage: ['keyCertSign', 'cRLSign'],
      };

      const certPem = createSelfSignedCert(
        keyPair.privateKeyPem,
        subject,
        serial,
        notBefore,
        notAfter,
        extensions,
      );

      // Parse cert to extract fingerprint
      const parsed = parseCertificate(certPem);

      // Transactional inserts with FK ordering:
      // 1. Insert private key
      // 2. Insert CA (without certificateId yet)
      // 3. Insert certificate (with issuingCaId = CA id)
      // 4. Update CA with certificateId
      const ca = await db.transaction(async (tx) => {
        // 1. Insert private key
        const [privateKey] = await tx
          .insert(pkiPrivateKeys)
          .values({
            algorithm: input.keyAlgorithm,
            keySize: input.keySize ?? null,
            curve: input.keyCurve ?? null,
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

        // 2. Insert CA record (certificateId set later)
        const [caRecord] = await tx
          .insert(certificateAuthorities)
          .values({
            name: input.name,
            commonName: input.commonName,
            organization: input.organization ?? null,
            organizationalUnit: input.organizationalUnit ?? null,
            country: input.country ?? null,
            state: input.state ?? null,
            locality: input.locality ?? null,
            isRoot: true,
            pathLenConstraint: input.pathLenConstraint ?? null,
            privateKeyId: privateKey.id,
            status: CA_STATUSES.ACTIVE,
            serialCounter: 2, // serial 1 was used for the CA cert
            maxValidityDays: input.maxValidityDays,
            crlDistributionUrl: input.crlDistributionUrl ?? null,
            ocspUrl: input.ocspUrl ?? null,
          })
          .returning();

        if (!caRecord) {
          throw new Error('Failed to insert certificate authority');
        }

        // 3. Insert certificate (issuingCaId = this CA, self-issued)
        const [cert] = await tx
          .insert(certificates)
          .values({
            issuingCaId: caRecord.id,
            serialNumber: serial,
            commonName: input.commonName,
            organization: input.organization ?? null,
            organizationalUnit: input.organizationalUnit ?? null,
            country: input.country ?? null,
            state: input.state ?? null,
            locality: input.locality ?? null,
            certificatePem: certPem,
            fingerprint: parsed.fingerprint,
            notBefore,
            notAfter,
            certType: 'ca',
            status: CERT_STATUSES.ACTIVE,
            privateKeyId: privateKey.id,
          })
          .returning({ id: certificates.id });

        if (!cert) {
          throw new Error('Failed to insert certificate');
        }

        // 4. Update CA with certificateId
        const [updatedCa] = await tx
          .update(certificateAuthorities)
          .set({ certificateId: cert.id })
          .where(eq(certificateAuthorities.id, caRecord.id))
          .returning();

        if (!updatedCa) {
          throw new Error('Failed to update CA with certificate ID');
        }

        return updatedCa;
      });

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CA_CREATED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_authority',
        targetId: ca.id,
        details: { name: input.name, isRoot: true, keyAlgorithm: input.keyAlgorithm },
      }).catch(() => {});

      return ca;
    });
  }

  /**
   * Create an intermediate Certificate Authority (signed by a parent CA).
   */
  static async createIntermediateCA(
    input: CreateCaInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateAuthority>> {
    return tryCatch(async () => {
      if (!input.parentCaId) {
        throw new ServiceError('INVALID_INPUT', 'Intermediate CA requires a parentCaId');
      }
      if (!input.parentCaPassphrase) {
        throw new ServiceError('INVALID_INPUT', 'Parent passphrase is required for intermediate CA');
      }

      // Fetch parent CA
      const [parentCa] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, input.parentCaId));

      if (!parentCa) {
        throw new ServiceError('CA_NOT_FOUND', 'Parent CA not found');
      }

      if (parentCa.status !== CA_STATUSES.ACTIVE) {
        throw new ServiceError('CA_NOT_ACTIVE', 'Parent CA is not active');
      }

      // Validate pathLenConstraint: parent must allow sub-CAs
      // pathLenConstraint of 0 means the CA can only issue end-entity certs
      if (parentCa.pathLenConstraint !== null && parentCa.pathLenConstraint <= 0) {
        throw new ServiceError('HIERARCHY_VIOLATION', 'Parent CA path length constraint does not allow sub-CAs');
      }

      // Generate key pair for the new intermediate CA
      const keyPair = await generateKeyPair(input.keyAlgorithm, input.keySize, input.keyCurve);

      // Encrypt the new private key with the provided passphrase
      const encryptedKey = await encryptPrivateKey(keyPair.privateKeyPem, input.passphrase);

      // Build subject for the intermediate CA
      const subject = buildSubject(input);

      // Generate a CSR with the new key
      const csrPem = generateCSR(keyPair.privateKeyPem, subject);

      // Decrypt parent's private key
      const [parentPrivateKey] = await db
        .select()
        .from(pkiPrivateKeys)
        .where(eq(pkiPrivateKeys.id, parentCa.privateKeyId));

      if (!parentPrivateKey) {
        throw new Error('Parent CA private key not found');
      }

      let parentKeyPem: string;
      try {
        parentKeyPem = await decryptPrivateKey(
          parentPrivateKey.encryptedPrivateKeyPem,
          input.parentCaPassphrase,
          parentPrivateKey.kdfSalt,
          parentPrivateKey.kdfIv,
          parentPrivateKey.kdfTag,
        );
      } catch {
        throw new ServiceError('INVALID_PASSPHRASE', 'Failed to decrypt parent CA private key — incorrect passphrase');
      }

      // Get parent's certificate PEM
      if (!parentCa.certificateId) {
        throw new Error('Parent CA does not have an associated certificate');
      }

      const [parentCert] = await db
        .select({ certificatePem: certificates.certificatePem })
        .from(certificates)
        .where(eq(certificates.id, parentCa.certificateId));

      if (!parentCert) {
        throw new Error('Parent CA certificate not found');
      }

      // Atomically increment parent's serial counter
      const [serialResult] = await db
        .update(certificateAuthorities)
        .set({ serialCounter: sql`${certificateAuthorities.serialCounter} + 1` })
        .where(eq(certificateAuthorities.id, parentCa.id))
        .returning({ serialCounter: certificateAuthorities.serialCounter });

      if (!serialResult) {
        throw new Error('Failed to increment parent serial counter');
      }

      // The serial to use is the counter value before increment (current - 1)
      const serial = formatSerial(serialResult.serialCounter - 1);

      // Compute validity dates (constrained by parent's cert notAfter)
      const notBefore = new Date();
      const requestedNotAfter = new Date();
      requestedNotAfter.setDate(requestedNotAfter.getDate() + input.maxValidityDays);

      const [parentCertFull] = await db
        .select({ notAfter: certificates.notAfter })
        .from(certificates)
        .where(eq(certificates.id, parentCa.certificateId));

      const parentNotAfter = parentCertFull?.notAfter ?? requestedNotAfter;
      const notAfter = requestedNotAfter < parentNotAfter ? requestedNotAfter : parentNotAfter;

      // Compute child pathLenConstraint: must be less than parent's
      const childPathLen = input.pathLenConstraint !== undefined
        ? input.pathLenConstraint
        : (parentCa.pathLenConstraint !== null ? parentCa.pathLenConstraint - 1 : undefined);

      // Sign the certificate with the parent CA
      const extensions: CertificateExtensions = {
        basicConstraints: {
          cA: true,
          pathLenConstraint: childPathLen,
        },
        keyUsage: ['keyCertSign', 'cRLSign'],
      };

      const certPem = signCertificate(
        parentCert.certificatePem,
        parentKeyPem,
        csrPem,
        serial,
        extensions,
        notBefore,
        notAfter,
      );

      // Parse cert for fingerprint
      const parsed = parseCertificate(certPem);

      // Transactional inserts:
      // For intermediate CAs, parent already exists so FK ordering is simpler:
      // 1. Insert private key
      // 2. Insert certificate (issuingCaId = parentCaId)
      // 3. Insert CA record (certificateId = cert.id)
      const ca = await db.transaction(async (tx) => {
        // 1. Insert private key
        const [privateKey] = await tx
          .insert(pkiPrivateKeys)
          .values({
            algorithm: input.keyAlgorithm,
            keySize: input.keySize ?? null,
            curve: input.keyCurve ?? null,
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

        // 2. Insert certificate (issuingCaId = parent CA)
        const [cert] = await tx
          .insert(certificates)
          .values({
            issuingCaId: parentCa.id,
            serialNumber: serial,
            commonName: input.commonName,
            organization: input.organization ?? null,
            organizationalUnit: input.organizationalUnit ?? null,
            country: input.country ?? null,
            state: input.state ?? null,
            locality: input.locality ?? null,
            certificatePem: certPem,
            fingerprint: parsed.fingerprint,
            notBefore,
            notAfter,
            certType: 'ca',
            status: CERT_STATUSES.ACTIVE,
            privateKeyId: privateKey.id,
          })
          .returning({ id: certificates.id });

        if (!cert) {
          throw new Error('Failed to insert certificate');
        }

        // 3. Insert CA record with certificateId
        const [caRecord] = await tx
          .insert(certificateAuthorities)
          .values({
            name: input.name,
            commonName: input.commonName,
            organization: input.organization ?? null,
            organizationalUnit: input.organizationalUnit ?? null,
            country: input.country ?? null,
            state: input.state ?? null,
            locality: input.locality ?? null,
            parentCaId: parentCa.id,
            isRoot: false,
            pathLenConstraint: childPathLen ?? null,
            certificateId: cert.id,
            privateKeyId: privateKey.id,
            status: CA_STATUSES.ACTIVE,
            serialCounter: 2, // serial 1 reserved, start issuing from 2
            maxValidityDays: input.maxValidityDays,
            crlDistributionUrl: input.crlDistributionUrl ?? null,
            ocspUrl: input.ocspUrl ?? null,
          })
          .returning();

        if (!caRecord) {
          throw new Error('Failed to insert certificate authority');
        }

        return caRecord;
      });

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CA_CREATED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_authority',
        targetId: ca.id,
        details: {
          name: input.name,
          isRoot: false,
          parentCaId: parentCa.id,
          keyAlgorithm: input.keyAlgorithm,
        },
      }).catch(() => {});

      return ca;
    });
  }

  /**
   * Get a single CA by ID.
   */
  static async getById(id: string): Promise<Result<CertificateAuthority>> {
    return tryCatch(async () => {
      const [ca] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, id));

      if (!ca) {
        throw new ServiceError('CA_NOT_FOUND', 'Certificate authority not found');
      }

      return ca;
    });
  }

  /**
   * Paginated list of CAs with optional status and isRoot filters.
   */
  static async list(params: ListCaQuery): Promise<Result<{ cas: CertificateAuthority[]; total: number }>> {
    return tryCatch(async () => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions: SQL[] = [];

      if (params.status) {
        conditions.push(eq(certificateAuthorities.status, params.status));
      }

      if (params.isRoot !== undefined) {
        conditions.push(eq(certificateAuthorities.isRoot, params.isRoot));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [cas, countResult] = await Promise.all([
        db
          .select()
          .from(certificateAuthorities)
          .where(whereClause)
          .orderBy(desc(certificateAuthorities.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(certificateAuthorities)
          .where(whereClause),
      ]);

      return {
        cas,
        total: Number(countResult[0]?.count ?? 0),
      };
    });
  }

  /**
   * Fetch all CAs for hierarchy display.
   * Returns a flat list; the frontend can build a tree from parentCaId relationships.
   */
  static async getHierarchy(): Promise<Result<CertificateAuthority[]>> {
    return tryCatch(async () => {
      const cas = await db
        .select()
        .from(certificateAuthorities)
        .orderBy(asc(certificateAuthorities.createdAt));

      return cas;
    });
  }

  /**
   * Update allowed fields on a CA.
   */
  static async update(
    id: string,
    input: UpdateCaInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateAuthority>> {
    return tryCatch(async () => {
      // Verify CA exists
      const [existing] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, id));

      if (!existing) {
        throw new ServiceError('CA_NOT_FOUND', 'Certificate authority not found');
      }

      const [updated] = await db
        .update(certificateAuthorities)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.maxValidityDays !== undefined && { maxValidityDays: input.maxValidityDays }),
          ...(input.crlDistributionUrl !== undefined && { crlDistributionUrl: input.crlDistributionUrl }),
          ...(input.ocspUrl !== undefined && { ocspUrl: input.ocspUrl }),
          updatedAt: new Date(),
        })
        .where(eq(certificateAuthorities.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update certificate authority');
      }

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CA_UPDATED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_authority',
        targetId: id,
        details: { changes: input },
      }).catch(() => {});

      return updated;
    });
  }

  /**
   * Suspend an active CA.
   */
  static async suspend(
    id: string,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateAuthority>> {
    return tryCatch(async () => {
      const [ca] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, id));

      if (!ca) {
        throw new ServiceError('CA_NOT_FOUND', 'Certificate authority not found');
      }

      if (ca.status !== CA_STATUSES.ACTIVE) {
        throw new ServiceError('CA_NOT_ACTIVE', 'Only active CAs can be suspended');
      }

      const [updated] = await db
        .update(certificateAuthorities)
        .set({ status: CA_STATUSES.SUSPENDED, updatedAt: new Date() })
        .where(eq(certificateAuthorities.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to suspend certificate authority');
      }

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CA_SUSPENDED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_authority',
        targetId: id,
        details: { previousStatus: ca.status },
      }).catch(() => {});

      return updated;
    });
  }

  /**
   * Retire an active or suspended CA. Retirement is permanent.
   */
  static async retire(
    id: string,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateAuthority>> {
    return tryCatch(async () => {
      const [ca] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, id));

      if (!ca) {
        throw new ServiceError('CA_NOT_FOUND', 'Certificate authority not found');
      }

      if (ca.status !== CA_STATUSES.ACTIVE && ca.status !== CA_STATUSES.SUSPENDED) {
        throw new ServiceError('CA_NOT_ACTIVE', 'Only active or suspended CAs can be retired');
      }

      const [updated] = await db
        .update(certificateAuthorities)
        .set({ status: CA_STATUSES.RETIRED, updatedAt: new Date() })
        .where(eq(certificateAuthorities.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to retire certificate authority');
      }

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CA_RETIRED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_authority',
        targetId: id,
        details: { previousStatus: ca.status },
      }).catch(() => {});

      return updated;
    });
  }

  /**
   * Get the certificate chain for a CA, walking up parentCaId to the root.
   * Returns an array of PEM strings from the given CA (leaf) to the root.
   */
  static async getChain(id: string): Promise<Result<string[]>> {
    return tryCatch(async () => {
      const chain: string[] = [];
      let currentId: string | null = id;

      while (currentId) {
        const [ca] = await db
          .select({
            certificateId: certificateAuthorities.certificateId,
            parentCaId: certificateAuthorities.parentCaId,
          })
          .from(certificateAuthorities)
          .where(eq(certificateAuthorities.id, currentId));

        if (!ca) {
          throw new ServiceError('CA_NOT_FOUND', `Certificate authority ${currentId} not found in chain`);
        }

        if (!ca.certificateId) {
          throw new Error(`CA ${currentId} does not have an associated certificate`);
        }

        const [cert] = await db
          .select({ certificatePem: certificates.certificatePem })
          .from(certificates)
          .where(eq(certificates.id, ca.certificateId));

        if (!cert) {
          throw new Error(`Certificate not found for CA ${currentId}`);
        }

        chain.push(cert.certificatePem);
        currentId = ca.parentCaId;
      }

      return chain;
    });
  }

  /**
   * Atomically increment and return the new serial counter for a CA.
   */
  static async incrementSerial(id: string): Promise<Result<number>> {
    return tryCatch(async () => {
      const [result] = await db
        .update(certificateAuthorities)
        .set({ serialCounter: sql`${certificateAuthorities.serialCounter} + 1` })
        .where(eq(certificateAuthorities.id, id))
        .returning({ serialCounter: certificateAuthorities.serialCounter });

      if (!result) {
        throw new ServiceError('CA_NOT_FOUND', 'Certificate authority not found');
      }

      return result.serialCounter;
    });
  }
}
