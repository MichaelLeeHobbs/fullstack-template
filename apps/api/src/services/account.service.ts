// ===========================================
// Account Service
// ===========================================
// Handles account-related operations: verification, password reset, etc.

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import {
  users,
  sessions,
  emailVerificationTokens,
  passwordResetTokens,
} from '../db/schema/index.js';
import { eq, and, gt } from 'drizzle-orm';
import { enqueue } from '../jobs/index.js';
import { NotificationService } from './notification.service.js';
import logger from '../lib/logger.js';

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_HOURS = 24;
const PASSWORD_RESET_TOKEN_HOURS = 1;

export class AccountService {
  // ===========================================
  // Email Verification
  // ===========================================

  /**
   * Create and send email verification token
   */
  static async sendVerificationEmail(userId: string, email: string): Promise<Result<void>> {
    return tryCatch(async () => {
      // Delete any existing tokens for this user
      await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, userId));

      // Create new token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_HOURS);

      await db.insert(emailVerificationTokens).values({
        userId,
        token,
        expiresAt,
      });

      // Enqueue email
      await enqueue('email.verification', { email, token });

      logger.info({ userId, email }, 'Verification email enqueued');
    });
  }

  /**
   * Resend verification email by email address (public — no auth required)
   * Silently succeeds if email not found (prevents enumeration)
   */
  static async resendVerificationByEmail(email: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const [user] = await db
        .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (!user || user.emailVerified) {
        return; // Silently succeed to prevent enumeration
      }

      await this.sendVerificationEmail(user.id, user.email);
    });
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<Result<{ userId: string }>> {
    return tryCatch(async () => {
      // Find valid token
      const [tokenRecord] = await db
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.token, token),
            gt(emailVerificationTokens.expiresAt, new Date())
          )
        );

      if (!tokenRecord) {
        throw new Error('Invalid or expired verification token');
      }

      // Transaction: update user + delete token atomically
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(eq(users.id, tokenRecord.userId));

        await tx
          .delete(emailVerificationTokens)
          .where(eq(emailVerificationTokens.id, tokenRecord.id));
      });

      logger.info({ userId: tokenRecord.userId }, 'Email verified');

      return { userId: tokenRecord.userId };
    });
  }

  // ===========================================
  // Password Reset
  // ===========================================

  /**
   * Request password reset (send email)
   */
  static async requestPasswordReset(email: string): Promise<Result<void>> {
    return tryCatch(async () => {
      // Find user by email
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      // Always return success to prevent email enumeration
      if (!user) {
        logger.info({ email }, 'Password reset requested for non-existent email');
        return;
      }

      // Delete any existing tokens for this user
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id));

      // Create new token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_TOKEN_HOURS);

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Enqueue email
      await enqueue('email.password-reset', { email: user.email, token });

      logger.info({ userId: user.id }, 'Password reset email enqueued');
    });
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<Result<void>> {
    return tryCatch(async () => {
      // Find valid token
      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        );

      if (!tokenRecord) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash outside transaction (CPU-bound)
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Transaction: update password + delete token + invalidate sessions atomically
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(users.id, tokenRecord.userId));

        await tx
          .delete(passwordResetTokens)
          .where(eq(passwordResetTokens.id, tokenRecord.id));

        // Invalidate all sessions — user must re-login after password reset
        await tx
          .delete(sessions)
          .where(eq(sessions.userId, tokenRecord.userId));
      });

      logger.info({ userId: tokenRecord.userId }, 'Password reset successful');

      // Fire-and-forget notification
      NotificationService.create({
        userId: tokenRecord.userId,
        title: 'Password changed',
        body: 'Your password was recently changed. If you did not do this, please contact support immediately.',
        type: 'warning',
        category: 'security',
      }).catch(() => {});
    });
  }

  // ===========================================
  // Account Status
  // ===========================================

  /**
   * Deactivate a user account
   */
  static async deactivateUser(userId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Fire-and-forget notification
      NotificationService.create({
        userId,
        title: 'Account deactivated',
        body: 'Your account has been deactivated by an administrator.',
        type: 'error',
        category: 'account',
      }).catch(() => {});

      logger.info({ userId }, 'User deactivated');
    });
  }

  /**
   * Activate a user account
   */
  static async activateUser(userId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      await db
        .update(users)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(users.id, userId));

      logger.info({ userId }, 'User activated');
    });
  }
}
