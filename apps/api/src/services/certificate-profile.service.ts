// ===========================================
// Certificate Profile Service
// ===========================================
// Manages certificate profiles (templates) for certificate issuance.
// Profiles define allowed key algorithms, key sizes, extensions,
// and validity constraints for different certificate types.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import { certificateProfiles, type CertificateProfile } from '../db/schema/index.js';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { PkiAuditService, PKI_AUDIT_ACTIONS } from './pki-audit.service.js';
import type { CreateProfileInput, UpdateProfileInput, ListProfileQuery } from '../schemas/certificate-profile.schema.js';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CertificateProfileService {
  /**
   * Create a new certificate profile.
   */
  static async create(
    input: CreateProfileInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateProfile>> {
    return tryCatch(async () => {
      const [profile] = await db
        .insert(certificateProfiles)
        .values({
          name: input.name,
          description: input.description ?? null,
          certType: input.certType,
          allowedKeyAlgorithms: input.allowedKeyAlgorithms,
          minKeySize: input.minKeySize,
          keyUsage: input.keyUsage,
          extKeyUsage: input.extKeyUsage,
          basicConstraints: input.basicConstraints ?? null,
          maxValidityDays: input.maxValidityDays,
          subjectConstraints: input.subjectConstraints ?? null,
          sanConstraints: input.sanConstraints ?? null,
        })
        .returning();

      if (!profile) {
        throw new Error('Failed to insert certificate profile');
      }

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.PROFILE_CREATED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_profile',
        targetId: profile.id,
        details: { name: input.name, certType: input.certType },
      }).catch(() => {});

      return profile;
    });
  }

  /**
   * Get a single certificate profile by ID.
   */
  static async getById(id: string): Promise<Result<CertificateProfile>> {
    return tryCatch(async () => {
      const [profile] = await db
        .select()
        .from(certificateProfiles)
        .where(eq(certificateProfiles.id, id));

      if (!profile) {
        throw new ServiceError('PROFILE_NOT_FOUND', 'Certificate profile not found');
      }

      return profile;
    });
  }

  /**
   * Paginated list of certificate profiles with optional certType filter.
   */
  static async list(
    params: ListProfileQuery,
  ): Promise<Result<{ profiles: CertificateProfile[]; total: number }>> {
    return tryCatch(async () => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions: SQL[] = [];

      if (params.certType) {
        conditions.push(eq(certificateProfiles.certType, params.certType));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [profiles, countResult] = await Promise.all([
        db
          .select()
          .from(certificateProfiles)
          .where(whereClause)
          .orderBy(desc(certificateProfiles.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(certificateProfiles)
          .where(whereClause),
      ]);

      return {
        profiles,
        total: Number(countResult[0]?.count ?? 0),
      };
    });
  }

  /**
   * Update an existing certificate profile.
   */
  static async update(
    id: string,
    input: UpdateProfileInput,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<CertificateProfile>> {
    return tryCatch(async () => {
      // Verify profile exists
      const [existing] = await db
        .select()
        .from(certificateProfiles)
        .where(eq(certificateProfiles.id, id));

      if (!existing) {
        throw new ServiceError('PROFILE_NOT_FOUND', 'Certificate profile not found');
      }

      const [updated] = await db
        .update(certificateProfiles)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description ?? null }),
          ...(input.certType !== undefined && { certType: input.certType }),
          ...(input.allowedKeyAlgorithms !== undefined && { allowedKeyAlgorithms: input.allowedKeyAlgorithms }),
          ...(input.minKeySize !== undefined && { minKeySize: input.minKeySize }),
          ...(input.keyUsage !== undefined && { keyUsage: input.keyUsage }),
          ...(input.extKeyUsage !== undefined && { extKeyUsage: input.extKeyUsage }),
          ...(input.basicConstraints !== undefined && { basicConstraints: input.basicConstraints ?? null }),
          ...(input.maxValidityDays !== undefined && { maxValidityDays: input.maxValidityDays }),
          ...(input.subjectConstraints !== undefined && { subjectConstraints: input.subjectConstraints ?? null }),
          ...(input.sanConstraints !== undefined && { sanConstraints: input.sanConstraints ?? null }),
          updatedAt: new Date(),
        })
        .where(eq(certificateProfiles.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update certificate profile');
      }

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.PROFILE_UPDATED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_profile',
        targetId: id,
        details: { changes: input },
      }).catch(() => {});

      return updated;
    });
  }

  /**
   * Delete a certificate profile. Built-in profiles cannot be deleted.
   */
  static async delete(
    id: string,
    actorId: string,
    actorIp?: string,
  ): Promise<Result<{ message: string }>> {
    return tryCatch(async () => {
      // Verify profile exists
      const [existing] = await db
        .select()
        .from(certificateProfiles)
        .where(eq(certificateProfiles.id, id));

      if (!existing) {
        throw new ServiceError('PROFILE_NOT_FOUND', 'Certificate profile not found');
      }

      if (existing.isBuiltIn) {
        throw new ServiceError('SYSTEM_PROTECTED', 'Built-in profiles cannot be deleted');
      }

      await db
        .delete(certificateProfiles)
        .where(eq(certificateProfiles.id, id));

      // Audit log (fire-and-forget)
      PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.PROFILE_DELETED,
        actorId,
        actorIp: actorIp ?? null,
        targetType: 'certificate_profile',
        targetId: id,
        details: { name: existing.name },
      }).catch(() => {});

      return { message: 'Certificate profile deleted successfully' };
    });
  }

  /**
   * Validate certificate issuance parameters against a profile's constraints.
   * Throws PROFILE_CONSTRAINT_VIOLATION with details on the first failure.
   */
  static async validateAgainstProfile(
    profileId: string,
    keyAlgorithm: string,
    keySize: number | undefined,
    validityDays: number,
  ): Promise<Result<void>> {
    return tryCatch(async () => {
      const [profile] = await db
        .select()
        .from(certificateProfiles)
        .where(eq(certificateProfiles.id, profileId));

      if (!profile) {
        throw new ServiceError('PROFILE_NOT_FOUND', 'Certificate profile not found');
      }

      // Check key algorithm is allowed
      if (!profile.allowedKeyAlgorithms.includes(keyAlgorithm)) {
        throw new ServiceError(
          'PROFILE_CONSTRAINT_VIOLATION',
          `Key algorithm '${keyAlgorithm}' is not allowed by profile '${profile.name}'. Allowed: ${profile.allowedKeyAlgorithms.join(', ')}`,
          { field: 'keyAlgorithm', allowed: profile.allowedKeyAlgorithms, provided: keyAlgorithm },
        );
      }

      // Check key size meets minimum (only for RSA where keySize is relevant)
      const effectiveKeySize = keySize ?? 2048;
      if (effectiveKeySize < profile.minKeySize) {
        throw new ServiceError(
          'PROFILE_CONSTRAINT_VIOLATION',
          `Key size ${effectiveKeySize} is below the minimum of ${profile.minKeySize} required by profile '${profile.name}'`,
          { field: 'keySize', minimum: profile.minKeySize, provided: effectiveKeySize },
        );
      }

      // Check validity does not exceed maximum
      if (validityDays > profile.maxValidityDays) {
        throw new ServiceError(
          'PROFILE_CONSTRAINT_VIOLATION',
          `Validity of ${validityDays} days exceeds the maximum of ${profile.maxValidityDays} days allowed by profile '${profile.name}'`,
          { field: 'validityDays', maximum: profile.maxValidityDays, provided: validityDays },
        );
      }
    });
  }
}
