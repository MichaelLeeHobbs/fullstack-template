// ===========================================
// MFA Service
// ===========================================
// Generic MFA orchestrator with method-specific dispatch.
// Currently implements TOTP; extensible for future methods.

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { userMfaMethods, MFA_METHODS, type MfaMethod, type TotpConfig } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

const BACKUP_CODE_COUNT = 10;
const SALT_ROUNDS = 10;

interface VerifyResult {
  valid: boolean;
  backupUsed: boolean;
}

interface TotpSetupResult {
  secret: string;
  qrCodeDataUrl: string;
  method: MfaMethod;
}

interface EnableResult {
  backupCodes: string[];
}

export class MfaService {
  /**
   * Get enabled MFA methods for a user
   */
  static async getEnabledMethods(userId: string): Promise<Result<MfaMethod[]>> {
    return tryCatch(async () => {
      const methods = await db
        .select({ method: userMfaMethods.method })
        .from(userMfaMethods)
        .where(and(
          eq(userMfaMethods.userId, userId),
          eq(userMfaMethods.isEnabled, true),
          eq(userMfaMethods.isVerified, true),
        ));

      return methods.map((m) => m.method as MfaMethod);
    });
  }

  /**
   * Verify an MFA code — dispatches by method type
   */
  static async verify(userId: string, method: string, token: string): Promise<Result<VerifyResult>> {
    return tryCatch(async () => {
      switch (method) {
        case MFA_METHODS.TOTP:
          return await this.verifyTotp(userId, token);
        default:
          throw new Error(`Unsupported MFA method: ${method}`);
      }
    });
  }

  /**
   * Begin TOTP setup — generate secret and QR code
   */
  static async setupTotp(userId: string, email: string): Promise<Result<TotpSetupResult>> {
    return tryCatch(async () => {
      // Generate TOTP secret
      const totp = new OTPAuth.TOTP({
        issuer: 'FullstackTemplate',
        label: email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });

      const secret = totp.secret.base32;

      // Upsert the MFA method record (not yet enabled/verified)
      const existing = await db
        .select({ id: userMfaMethods.id })
        .from(userMfaMethods)
        .where(and(
          eq(userMfaMethods.userId, userId),
          eq(userMfaMethods.method, MFA_METHODS.TOTP),
        ));

      const config: TotpConfig = { secret, backupCodes: [] };

      if (existing.length > 0) {
        await db
          .update(userMfaMethods)
          .set({ config, isEnabled: false, isVerified: false, updatedAt: new Date() })
          .where(eq(userMfaMethods.id, existing[0]!.id));
      } else {
        await db.insert(userMfaMethods).values({
          userId,
          method: MFA_METHODS.TOTP,
          config,
          isEnabled: false,
          isVerified: false,
        });
      }

      // Generate QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(totp.toString());

      return { secret, qrCodeDataUrl, method: MFA_METHODS.TOTP };
    });
  }

  /**
   * Verify the initial TOTP setup and enable it
   */
  static async verifyAndEnableTotp(userId: string, code: string): Promise<Result<EnableResult>> {
    return tryCatch(async () => {
      const [record] = await db
        .select()
        .from(userMfaMethods)
        .where(and(
          eq(userMfaMethods.userId, userId),
          eq(userMfaMethods.method, MFA_METHODS.TOTP),
        ));

      if (!record) {
        throw new Error('TOTP not set up. Please start setup first.');
      }

      const config = record.config as TotpConfig;

      // Verify the code against the secret
      const totp = new OTPAuth.TOTP({
        issuer: 'FullstackTemplate',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(config.secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        throw new Error('Invalid verification code');
      }

      // Generate backup codes
      const rawCodes: string[] = [];
      const hashedCodes: string[] = [];

      for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        const rawCode = randomBytes(4).toString('hex'); // 8 hex chars
        rawCodes.push(rawCode);
        hashedCodes.push(await bcrypt.hash(rawCode, SALT_ROUNDS));
      }

      // Update record: store hashed backup codes, enable, verify
      const updatedConfig: TotpConfig = { secret: config.secret, backupCodes: hashedCodes };

      await db
        .update(userMfaMethods)
        .set({ config: updatedConfig, isEnabled: true, isVerified: true, updatedAt: new Date() })
        .where(eq(userMfaMethods.id, record.id));

      return { backupCodes: rawCodes };
    });
  }

  /**
   * Disable an MFA method (requires valid code to confirm)
   */
  static async disable(userId: string, method: string, code: string): Promise<Result<void>> {
    return tryCatch(async () => {
      // Verify the code first
      const verifyResult = await this.verify(userId, method, code);
      if (!verifyResult.ok || !verifyResult.value.valid) {
        throw new Error('Invalid code');
      }

      // Delete the MFA record
      await db
        .delete(userMfaMethods)
        .where(and(
          eq(userMfaMethods.userId, userId),
          eq(userMfaMethods.method, method),
        ));
    });
  }

  /**
   * Regenerate backup codes (requires valid TOTP code)
   */
  static async regenerateBackupCodes(userId: string, method: string, code: string): Promise<Result<EnableResult>> {
    return tryCatch(async () => {
      // Verify the TOTP code (not backup)
      const [record] = await db
        .select()
        .from(userMfaMethods)
        .where(and(
          eq(userMfaMethods.userId, userId),
          eq(userMfaMethods.method, method),
          eq(userMfaMethods.isEnabled, true),
        ));

      if (!record) {
        throw new Error('MFA method not found or not enabled');
      }

      const config = record.config as TotpConfig;

      // Verify TOTP code (not backup)
      const totp = new OTPAuth.TOTP({
        issuer: 'FullstackTemplate',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(config.secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        throw new Error('Invalid TOTP code');
      }

      // Generate new backup codes
      const rawCodes: string[] = [];
      const hashedCodes: string[] = [];

      for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        const rawCode = randomBytes(4).toString('hex');
        rawCodes.push(rawCode);
        hashedCodes.push(await bcrypt.hash(rawCode, SALT_ROUNDS));
      }

      const updatedConfig: TotpConfig = { secret: config.secret, backupCodes: hashedCodes };

      await db
        .update(userMfaMethods)
        .set({ config: updatedConfig, updatedAt: new Date() })
        .where(eq(userMfaMethods.id, record.id));

      return { backupCodes: rawCodes };
    });
  }

  /**
   * Verify a TOTP code or backup code
   */
  private static async verifyTotp(userId: string, token: string): Promise<VerifyResult> {
    const [record] = await db
      .select()
      .from(userMfaMethods)
      .where(and(
        eq(userMfaMethods.userId, userId),
        eq(userMfaMethods.method, MFA_METHODS.TOTP),
        eq(userMfaMethods.isEnabled, true),
      ));

    if (!record) {
      throw new Error('TOTP not enabled');
    }

    const config = record.config as TotpConfig;

    // Try TOTP code first
    const totp = new OTPAuth.TOTP({
      issuer: 'FullstackTemplate',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(config.secret),
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta !== null) {
      return { valid: true, backupUsed: false };
    }

    // Try backup codes
    for (let i = 0; i < config.backupCodes.length; i++) {
      const matches = await bcrypt.compare(token, config.backupCodes[i]!);
      if (matches) {
        // Remove used backup code
        const updatedCodes = [...config.backupCodes];
        updatedCodes.splice(i, 1);
        const updatedConfig: TotpConfig = { secret: config.secret, backupCodes: updatedCodes };

        await db
          .update(userMfaMethods)
          .set({ config: updatedConfig, updatedAt: new Date() })
          .where(eq(userMfaMethods.id, record.id));

        return { valid: true, backupUsed: true };
      }
    }

    return { valid: false, backupUsed: false };
  }
}
