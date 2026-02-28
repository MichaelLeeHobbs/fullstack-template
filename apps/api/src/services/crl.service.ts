// ===========================================
// CRL Service
// ===========================================
// Manages Certificate Revocation List generation, retrieval, and history.
// Generates CRLs by collecting all revocations for a given CA and
// signing the list with the CA's private key.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import {
  crls, type Crl,
  certificateAuthorities, CA_STATUSES,
  certificates,
  revocations,
  pkiPrivateKeys,
} from '../db/schema/index.js';
import { eq, desc, sql, max } from 'drizzle-orm';
import { signCRL, decryptPrivateKey } from '../lib/pki-crypto.js';
import { PkiAuditService, PKI_AUDIT_ACTIONS } from './pki-audit.service.js';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CrlService {
  /**
   * Generate a new CRL for the given CA.
   *
   * Collects all revocations for certificates issued by this CA,
   * signs a CRL with the CA's private key, and stores the result.
   */
  static async generate(
    caId: string,
    caPassphrase: string,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<Crl>> {
    return tryCatch(async () => {
      // 1. Verify the CA exists and is active or suspended
      const [ca] = await db
        .select()
        .from(certificateAuthorities)
        .where(eq(certificateAuthorities.id, caId));

      if (!ca) {
        throw new ServiceError('CA_NOT_FOUND', 'Certificate authority not found');
      }

      if (ca.status !== CA_STATUSES.ACTIVE && ca.status !== CA_STATUSES.SUSPENDED) {
        throw new ServiceError('CA_NOT_ACTIVE', 'Certificate authority must be active or suspended to generate CRLs');
      }

      // 2. Get all revocations for certificates issued by this CA
      const revokedCerts = await db
        .select({
          serialNumber: certificates.serialNumber,
          revokedAt: revocations.revokedAt,
          reason: revocations.reason,
        })
        .from(revocations)
        .innerJoin(certificates, eq(revocations.certificateId, certificates.id))
        .where(eq(certificates.issuingCaId, caId));

      // Build revoked entries for signCRL
      const revokedEntries = revokedCerts.map((entry) => ({
        serial: entry.serialNumber,
        date: entry.revokedAt,
        reason: entry.reason,
      }));

      // 3. Compute next CRL number
      const [maxResult] = await db
        .select({ maxNumber: max(crls.crlNumber) })
        .from(crls)
        .where(eq(crls.caId, caId));

      const crlNumber = (maxResult?.maxNumber ?? 0) + 1;

      // 4. Compute update window
      const thisUpdate = new Date();
      const nextUpdate = new Date();
      nextUpdate.setDate(nextUpdate.getDate() + 7);

      // 5. Decrypt CA's private key
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
          caPassphrase,
          caPrivateKey.kdfSalt,
          caPrivateKey.kdfIv,
          caPrivateKey.kdfTag,
        );
      } catch {
        throw new ServiceError('INVALID_PASSPHRASE', 'Failed to decrypt CA private key — incorrect passphrase');
      }

      // 6. Get the CA's certificate PEM
      if (!ca.certificateId) {
        throw new Error('CA does not have an associated certificate');
      }

      const [caCert] = await db
        .select({ certificatePem: certificates.certificatePem })
        .from(certificates)
        .where(eq(certificates.id, ca.certificateId));

      if (!caCert) {
        throw new Error('CA certificate not found');
      }

      // 7. Sign the CRL
      const crlPem = signCRL(
        caCert.certificatePem,
        caKeyPem,
        revokedEntries,
        crlNumber,
        thisUpdate,
        nextUpdate,
      );

      // 8. Insert the CRL record
      const [crl] = await db
        .insert(crls)
        .values({
          caId,
          crlNumber,
          crlPem,
          thisUpdate,
          nextUpdate,
          entriesCount: revokedEntries.length,
        })
        .returning();

      if (!crl) {
        throw new Error('Failed to insert CRL');
      }

      // 9. Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CRL_GENERATED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'crl',
        targetId: crl.id,
        details: { caId, crlNumber, entriesCount: revokedEntries.length },
      }).catch(() => {});

      return crl;
    });
  }

  /**
   * Get the most recent CRL for a CA.
   */
  static async getLatest(caId: string): Promise<Result<Crl>> {
    return tryCatch(async () => {
      const [crl] = await db
        .select()
        .from(crls)
        .where(eq(crls.caId, caId))
        .orderBy(desc(crls.crlNumber))
        .limit(1);

      if (!crl) {
        throw new ServiceError('NOT_FOUND', 'No CRL found for this certificate authority');
      }

      return crl;
    });
  }

  /**
   * Paginated history of CRLs for a CA.
   */
  static async getHistory(
    caId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<Result<{ crls: Crl[]; total: number }>> {
    return tryCatch(async () => {
      const offset = (page - 1) * limit;

      const whereClause = eq(crls.caId, caId);

      const [crlList, countResult] = await Promise.all([
        db
          .select()
          .from(crls)
          .where(whereClause)
          .orderBy(desc(crls.crlNumber))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(crls)
          .where(whereClause),
      ]);

      return {
        crls: crlList,
        total: Number(countResult[0]?.count ?? 0),
      };
    });
  }
}
