// ===========================================
// CSR Service
// ===========================================
// Manages Certificate Signing Request workflow: submission, listing,
// approval (with certificate issuance), and rejection.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import {
  certificateRequests, type CertificateRequest, CSR_STATUSES,
  certificateAuthorities, CA_STATUSES,
  certificates, CERT_STATUSES,
  certificateProfiles,
  pkiPrivateKeys,
} from '../db/schema/index.js';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import {
  parseCSR, signCertificate, decryptPrivateKey, parseCertificate,
  type CertificateExtensions,
} from '../lib/pki-crypto.js';
import { PkiAuditService, PKI_AUDIT_ACTIONS } from './pki-audit.service.js';
import type {
  SubmitCsrInput, ApproveCsrInput, ListCsrQuery,
} from '../schemas/csr.schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a serial number as a zero-padded hex string (8 chars minimum).
 */
function formatSerial(serial: number): string {
  return serial.toString(16).padStart(8, '0');
}

/**
 * Build a single-line subject DN string from parsed CSR subject fields.
 */
function buildSubjectDn(subject: { commonName: string; organization?: string; organizationalUnit?: string; country?: string; state?: string; locality?: string }): string {
  const parts: string[] = [];
  if (subject.commonName) parts.push(`CN=${subject.commonName}`);
  if (subject.organization) parts.push(`O=${subject.organization}`);
  if (subject.organizationalUnit) parts.push(`OU=${subject.organizationalUnit}`);
  if (subject.country) parts.push(`C=${subject.country}`);
  if (subject.state) parts.push(`ST=${subject.state}`);
  if (subject.locality) parts.push(`L=${subject.locality}`);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CsrService {
  /**
   * Submit a new Certificate Signing Request.
   */
  static async submit(
    input: SubmitCsrInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateRequest>> {
    return tryCatch(async () => {
      // Parse the CSR PEM to extract subject information
      let parsed: ReturnType<typeof parseCSR>;
      try {
        parsed = parseCSR(input.csrPem);
      } catch {
        throw new ServiceError('INVALID_INPUT', 'Invalid CSR PEM — failed to parse');
      }

      const commonName = parsed.subject.commonName;
      if (!commonName) {
        throw new ServiceError('INVALID_INPUT', 'CSR must contain a Common Name (CN)');
      }

      const subjectDn = buildSubjectDn(parsed.subject);

      // Verify the target CA exists
      const [ca] = await db
        .select({ id: certificateAuthorities.id })
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, input.targetCaId));

      if (!ca) {
        throw new ServiceError('CA_NOT_FOUND', 'Target certificate authority not found');
      }

      // Insert the certificate request
      const [request] = await db
        .insert(certificateRequests)
        .values({
          csrPem: input.csrPem,
          commonName,
          subjectDn,
          targetCaId: input.targetCaId,
          profileId: input.profileId ?? null,
          status: CSR_STATUSES.PENDING,
          requestedBy: actorId,
        })
        .returning();

      if (!request) {
        throw new Error('Failed to insert certificate request');
      }

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CSR_SUBMITTED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_request',
        targetId: request.id,
        details: { commonName, targetCaId: input.targetCaId, profileId: input.profileId ?? null },
      }).catch(() => {});

      return request;
    });
  }

  /**
   * Get a single CSR by ID.
   */
  static async getById(id: string): Promise<Result<CertificateRequest>> {
    return tryCatch(async () => {
      const [request] = await db
        .select()
        .from(certificateRequests)
        .where(eq(certificateRequests.id, id));

      if (!request) {
        throw new ServiceError('NOT_FOUND', 'Certificate request not found');
      }

      return request;
    });
  }

  /**
   * Paginated list of CSRs with optional status and targetCaId filters.
   */
  static async list(
    params: ListCsrQuery,
  ): Promise<Result<{ requests: CertificateRequest[]; total: number }>> {
    return tryCatch(async () => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions: SQL[] = [];

      if (params.status) {
        conditions.push(eq(certificateRequests.status, params.status));
      }

      if (params.targetCaId) {
        conditions.push(eq(certificateRequests.targetCaId, params.targetCaId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [requests, countResult] = await Promise.all([
        db
          .select()
          .from(certificateRequests)
          .where(whereClause)
          .orderBy(desc(certificateRequests.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(certificateRequests)
          .where(whereClause),
      ]);

      return {
        requests,
        total: Number(countResult[0]?.count ?? 0),
      };
    });
  }

  /**
   * Approve a pending CSR: sign the certificate and update the request.
   */
  static async approve(
    id: string,
    input: ApproveCsrInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<{ request: CertificateRequest; certificate: typeof certificates.$inferSelect }>> {
    return tryCatch(async () => {
      // 1. Find the CSR and verify it is pending
      const [request] = await db
        .select()
        .from(certificateRequests)
        .where(eq(certificateRequests.id, id));

      if (!request) {
        throw new ServiceError('NOT_FOUND', 'Certificate request not found');
      }

      if (request.status !== CSR_STATUSES.PENDING) {
        throw new ServiceError('INVALID_INPUT', `Certificate request is already ${request.status}`);
      }

      // 2. Parse the CSR PEM
      const parsed = parseCSR(request.csrPem);

      // 3. Get the target CA and verify it is active
      const [ca] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, request.targetCaId));

      if (!ca) {
        throw new ServiceError('CA_NOT_FOUND', 'Target certificate authority not found');
      }

      if (ca.status !== CA_STATUSES.ACTIVE) {
        throw new ServiceError('CA_NOT_ACTIVE', 'Target certificate authority is not active');
      }

      // 4. If CSR has profileId, validate against profile
      let profile: typeof certificateProfiles.$inferSelect | null = null;
      if (request.profileId) {
        const [fetchedProfile] = await db
          .select()
          .from(certificateProfiles)
          .where(eq(certificateProfiles.id, request.profileId));

        profile = fetchedProfile ?? null;
      }

      // 5. Decrypt CA private key
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

      // 6. Get CA certificate PEM
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

      // 7. Increment CA serial counter
      const [serialResult] = await db
        .update(certificateAuthorities)
        .set({ serialCounter: sql`${certificateAuthorities.serialCounter} + 1` })
        .where(eq(certificateAuthorities.id, ca.id))
        .returning({ serialCounter: certificateAuthorities.serialCounter });

      if (!serialResult) {
        throw new Error('Failed to increment CA serial counter');
      }

      const serial = formatSerial(serialResult.serialCounter - 1);

      // 8. Compute validity dates
      const validityDays = input.validityDays
        ?? profile?.maxValidityDays
        ?? ca.maxValidityDays;

      const notBefore = new Date();
      const requestedNotAfter = new Date();
      requestedNotAfter.setDate(requestedNotAfter.getDate() + validityDays);

      const caNotAfter = caCert.notAfter ?? requestedNotAfter;
      const notAfter = requestedNotAfter < caNotAfter ? requestedNotAfter : caNotAfter;

      // 9. Build extensions from profile or defaults
      const extensions: CertificateExtensions = {};
      const certType = profile?.certType ?? 'server';

      if (profile) {
        extensions.keyUsage = profile.keyUsage;
        extensions.extKeyUsage = profile.extKeyUsage.length > 0 ? profile.extKeyUsage : undefined;
        if (profile.basicConstraints) {
          extensions.basicConstraints = {
            cA: profile.basicConstraints.ca,
            pathLenConstraint: profile.basicConstraints.pathLenConstraint,
          };
        }
      } else {
        // Default extensions for end-entity certificates
        extensions.keyUsage = ['digitalSignature', 'keyEncipherment'];
        extensions.basicConstraints = { cA: false };
      }

      // 10. Sign the certificate
      const certPem = signCertificate(
        caCert.certificatePem,
        caKeyPem,
        request.csrPem,
        serial,
        extensions,
        notBefore,
        notAfter,
      );

      // Parse cert for fingerprint
      const certParsed = parseCertificate(certPem);

      // 11. Transaction: insert certificate + update CSR
      const result = await db.transaction(async (tx) => {
        const [cert] = await tx
          .insert(certificates)
          .values({
            issuingCaId: ca.id,
            serialNumber: serial,
            commonName: request.commonName,
            organization: parsed.subject.organization ?? null,
            organizationalUnit: parsed.subject.organizationalUnit ?? null,
            country: parsed.subject.country ?? null,
            state: parsed.subject.state ?? null,
            locality: parsed.subject.locality ?? null,
            sans: request.sans ?? null,
            certificatePem: certPem,
            fingerprint: certParsed.fingerprint,
            notBefore,
            notAfter,
            certType,
            status: CERT_STATUSES.ACTIVE,
            profileId: request.profileId ?? null,
          })
          .returning();

        if (!cert) {
          throw new Error('Failed to insert certificate');
        }

        const [updatedRequest] = await tx
          .update(certificateRequests)
          .set({
            status: CSR_STATUSES.APPROVED,
            certificateId: cert.id,
            approvedBy: actorId,
            updatedAt: new Date(),
          })
          .where(eq(certificateRequests.id, id))
          .returning();

        if (!updatedRequest) {
          throw new Error('Failed to update certificate request');
        }

        return { request: updatedRequest, certificate: cert };
      });

      // 12. Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CSR_APPROVED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_request',
        targetId: id,
        details: {
          commonName: request.commonName,
          certificateId: result.certificate.id,
          caId: ca.id,
          certType,
        },
      }).catch(() => {});

      return result;
    });
  }

  /**
   * Reject a pending CSR with a reason.
   */
  static async reject(
    id: string,
    reason: string,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateRequest>> {
    return tryCatch(async () => {
      // Find the CSR and verify it is pending
      const [request] = await db
        .select()
        .from(certificateRequests)
        .where(eq(certificateRequests.id, id));

      if (!request) {
        throw new ServiceError('NOT_FOUND', 'Certificate request not found');
      }

      if (request.status !== CSR_STATUSES.PENDING) {
        throw new ServiceError('INVALID_INPUT', `Certificate request is already ${request.status}`);
      }

      // Update the request
      const [updated] = await db
        .update(certificateRequests)
        .set({
          status: CSR_STATUSES.REJECTED,
          rejectionReason: reason,
          approvedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(certificateRequests.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update certificate request');
      }

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CSR_REJECTED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_request',
        targetId: id,
        details: { commonName: request.commonName, reason },
      }).catch(() => {});

      return updated;
    });
  }
}
