// ===========================================
// Certificate Login Service
// ===========================================
// Handles mTLS certificate-based authentication, cert binding
// via attach codes, and cert status management.
// All methods return Result<T> using tryCatch from stderr-lib.

import { createHash } from 'crypto';
import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import {
  userCertificates,
  certAttachCodes,
  users,
  sessions,
  type UserCertificate,
} from '../db/schema/index.js';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { signAccessToken, signRefreshToken } from '../lib/jwt.js';
import { PkiAuditService, PKI_AUDIT_ACTIONS } from './pki-audit.service.js';
import type { ExtractedClientCert } from '../lib/extract-client-cert.js';

// ===========================================
// Constants
// ===========================================

const REFRESH_TOKEN_DAYS = 7;
const ATTACH_CODE_TTL_MINUTES = 15;
const ATTACH_CODE_HOURLY_LIMIT = 5;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ===========================================
// Types
// ===========================================

export interface CertLoginResult {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

// ===========================================
// Service
// ===========================================

export class CertLoginService {
  /**
   * Authenticate a user via client certificate.
   * Looks up the cert binding by serial + DN, verifies the user is active,
   * and creates a session with tokens.
   */
  static async loginWithCertificate(
    cert: ExtractedClientCert,
    metadata?: SessionMetadata,
  ): Promise<Result<CertLoginResult>> {
    return tryCatch(async () => {
      // Verify NGINX reported successful client cert authentication
      if (cert.authenticated !== 'SUCCESS') {
        await PkiAuditService.log({
          action: PKI_AUDIT_ACTIONS.CERT_LOGIN_FAILED,
          actorIp: metadata?.ipAddress ?? null,
          targetType: 'user_certificate',
          details: { reason: 'not_authenticated', dn: cert.dn, serial: cert.serial },
          success: false,
          errorMessage: `Certificate not authenticated: ${cert.authenticated}`,
        });
        throw new ServiceError('CERT_NOT_AUTHENTICATED', 'Client certificate was not authenticated');
      }

      // Look up the certificate binding
      const [binding] = await db
        .select()
        .from(userCertificates)
        .where(
          and(
            eq(userCertificates.certificateSerial, cert.serial),
            eq(userCertificates.certificateDn, cert.dn),
            eq(userCertificates.status, 'active'),
          ),
        );

      if (!binding) {
        await PkiAuditService.log({
          action: PKI_AUDIT_ACTIONS.CERT_LOGIN_FAILED,
          actorIp: metadata?.ipAddress ?? null,
          targetType: 'user_certificate',
          details: { reason: 'not_bound', dn: cert.dn, serial: cert.serial },
          success: false,
          errorMessage: 'No active certificate binding found',
        });
        throw new ServiceError('CERT_NOT_BOUND', 'Certificate is not bound to any user account');
      }

      // Verify the user exists and is active
      const [user] = await db
        .select({ id: users.id, email: users.email, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, binding.userId));

      if (!user || !user.isActive) {
        await PkiAuditService.log({
          action: PKI_AUDIT_ACTIONS.CERT_LOGIN_FAILED,
          actorId: binding.userId,
          actorIp: metadata?.ipAddress ?? null,
          targetType: 'user_certificate',
          targetId: binding.id,
          details: { reason: 'user_inactive' },
          success: false,
          errorMessage: 'User account is not active',
        });
        throw new ServiceError('ACCOUNT_DEACTIVATED', 'User account is not active');
      }

      // Update lastLoginAt
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Create session tokens
      const tokens = await this.createSession(user.id, metadata);

      // Audit log success
      await PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CERT_LOGIN_SUCCESS,
        actorId: user.id,
        actorIp: metadata?.ipAddress ?? null,
        targetType: 'user_certificate',
        targetId: binding.id,
        details: { dn: cert.dn, serial: cert.serial },
        success: true,
      });

      return {
        user: { id: user.id, email: user.email },
        ...tokens,
      };
    });
  }

  /**
   * Generate a one-time attach code for the authenticated user.
   * Rate-limited to 5 codes per hour per user.
   */
  static async generateAttachCode(userId: string): Promise<Result<{ code: string; expiresAt: Date }>> {
    return tryCatch(async () => {
      // Rate limit: count codes created in the last hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(certAttachCodes)
        .where(
          and(
            eq(certAttachCodes.userId, userId),
            gt(certAttachCodes.createdAt, oneHourAgo),
          ),
        );

      if (Number(countResult?.count ?? 0) >= ATTACH_CODE_HOURLY_LIMIT) {
        throw new ServiceError('RATE_LIMITED', 'Too many attach codes generated. Try again later.');
      }

      // Create code with TTL
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ATTACH_CODE_TTL_MINUTES);

      const [created] = await db
        .insert(certAttachCodes)
        .values({
          userId,
          expiresAt,
        })
        .returning({ code: certAttachCodes.code, expiresAt: certAttachCodes.expiresAt });

      if (!created) {
        throw new Error('Failed to create attach code');
      }

      return { code: created.code, expiresAt: created.expiresAt };
    });
  }

  /**
   * Attach a client certificate to a user account using a one-time code.
   * The code is validated, the certificate is checked for duplicates, and a binding is created.
   */
  static async attachCertificate(
    code: string,
    cert: ExtractedClientCert,
    label?: string,
    actorIp?: string,
  ): Promise<Result<UserCertificate>> {
    return tryCatch(async () => {
      // Find the attach code
      const [attachCode] = await db
        .select()
        .from(certAttachCodes)
        .where(
          and(
            eq(certAttachCodes.code, code),
            eq(certAttachCodes.used, false),
          ),
        );

      if (!attachCode) {
        throw new ServiceError('ATTACH_CODE_INVALID', 'Attach code is invalid or already used');
      }

      // Check expiration
      if (new Date() > attachCode.expiresAt) {
        throw new ServiceError('ATTACH_CODE_EXPIRED', 'Attach code has expired');
      }

      // Verify the certificate was successfully authenticated
      if (cert.authenticated !== 'SUCCESS') {
        throw new ServiceError('CERT_NOT_AUTHENTICATED', 'Client certificate was not authenticated');
      }

      // Check if this cert is already bound (by serial + DN)
      const [existing] = await db
        .select({ id: userCertificates.id })
        .from(userCertificates)
        .where(
          and(
            eq(userCertificates.certificateSerial, cert.serial),
            eq(userCertificates.certificateDn, cert.dn),
          ),
        );

      if (existing) {
        throw new ServiceError('ALREADY_EXISTS', 'This certificate is already bound to an account');
      }

      // Parse expiration date if provided
      let expiresAt: Date | null = null;
      if (cert.expiration) {
        const parsed = new Date(cert.expiration);
        if (!isNaN(parsed.getTime())) {
          expiresAt = parsed;
        }
      }

      // Create the binding
      const [binding] = await db
        .insert(userCertificates)
        .values({
          userId: attachCode.userId,
          certificateDn: cert.dn,
          certificateCn: cert.cn,
          certificateSerial: cert.serial,
          certificateFingerprint: cert.fingerprint || null,
          expiresAt,
          status: 'active',
          label: label ?? null,
        })
        .returning();

      if (!binding) {
        throw new Error('Failed to create certificate binding');
      }

      // Mark the code as used
      await db
        .update(certAttachCodes)
        .set({ used: true, usedAt: new Date() })
        .where(eq(certAttachCodes.id, attachCode.id));

      // Audit log
      await PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CERT_ATTACHED,
        actorId: attachCode.userId,
        actorIp: actorIp ?? null,
        targetType: 'user_certificate',
        targetId: binding.id,
        details: { dn: cert.dn, serial: cert.serial, cn: cert.cn },
        success: true,
      });

      return binding;
    });
  }

  /**
   * Get all certificate bindings for a user.
   */
  static async getCertStatus(userId: string): Promise<Result<UserCertificate[]>> {
    return tryCatch(async () => {
      const bindings = await db
        .select()
        .from(userCertificates)
        .where(eq(userCertificates.userId, userId))
        .orderBy(desc(userCertificates.createdAt));

      return bindings;
    });
  }

  /**
   * Remove a certificate binding. Verifies the binding belongs to the user.
   */
  static async removeBinding(
    id: string,
    userId: string,
    actorIp?: string,
  ): Promise<Result<void>> {
    return tryCatch(async () => {
      // Find the binding and verify ownership
      const [binding] = await db
        .select()
        .from(userCertificates)
        .where(
          and(
            eq(userCertificates.id, id),
            eq(userCertificates.userId, userId),
          ),
        );

      if (!binding) {
        throw new ServiceError('NOT_FOUND', 'Certificate binding not found');
      }

      // Delete the binding
      await db
        .delete(userCertificates)
        .where(eq(userCertificates.id, id));

      // Audit log
      await PkiAuditService.log({
        action: PKI_AUDIT_ACTIONS.CERT_BINDING_REMOVED,
        actorId: userId,
        actorIp: actorIp ?? null,
        targetType: 'user_certificate',
        targetId: id,
        details: { dn: binding.certificateDn, serial: binding.certificateSerial },
        success: true,
      });
    });
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  private static async createSession(
    userId: string,
    metadata?: SessionMetadata,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = signRefreshToken({ userId });
    const hashedToken = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        refreshToken: hashedToken,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        lastUsedAt: new Date(),
        expiresAt,
      })
      .returning({ id: sessions.id });

    const accessToken = signAccessToken({ userId, sessionId: session!.id });

    return { accessToken, refreshToken };
  }
}
