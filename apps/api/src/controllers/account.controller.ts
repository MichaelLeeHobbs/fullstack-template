// ===========================================
// Account Controller
// ===========================================
// Handles password recovery and email verification.

import type { Request, Response } from 'express';
import { AccountService } from '../services/account.service.js';
import { AuditService, type AuditContext } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import type { ForgotPasswordInput, ResetPasswordInput, VerifyEmailInput, ResendVerificationInput } from '../schemas/account.schema.js';
import logger from '../lib/logger.js';

export class AccountController {
  /**
   * POST /api/v1/account/forgot-password
   * Request password reset email
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const context: AuditContext = AuditService.getContextFromRequest(req);
    const { email } = req.body as ForgotPasswordInput;

    const result = await AccountService.requestPasswordReset(email);

    // Log the request (but don't reveal if email exists)
    await AuditService.log(
      AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
      context,
      `Email: ${email}`,
      result.ok
    );

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      data: { message: 'If an account with that email exists, a reset link has been sent.' },
    });
  }

  /**
   * POST /api/v1/account/reset-password
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    const context: AuditContext = AuditService.getContextFromRequest(req);
    const { token, password } = req.body as ResetPasswordInput;

    const result = await AccountService.resetPassword(token, password);

    if (!result.ok) {
      await AuditService.log(
        AUDIT_ACTIONS.PASSWORD_RESET_SUCCESS,
        context,
        'Failed: Invalid or expired token',
        false
      );

      return void res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    await AuditService.log(AUDIT_ACTIONS.PASSWORD_RESET_SUCCESS, context);

    res.json({
      success: true,
      data: { message: 'Password reset successful. You can now log in.' },
    });
  }

  /**
   * POST /api/v1/account/verify-email
   * Verify email with token
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const context: AuditContext = AuditService.getContextFromRequest(req);
    const { token } = req.body as VerifyEmailInput;

    const result = await AccountService.verifyEmail(token);

    if (!result.ok) {
      await AuditService.log(
        AUDIT_ACTIONS.EMAIL_VERIFIED,
        context,
        'Failed: Invalid or expired token',
        false
      );

      return void res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
    }

    await AuditService.log(
      AUDIT_ACTIONS.EMAIL_VERIFIED,
      { ...context, userId: result.value.userId }
    );

    res.json({
      success: true,
      data: { message: 'Email verified successfully.' },
    });
  }

  /**
   * POST /api/v1/account/resend-verification
   * Resend email verification
   */
  /**
   * POST /api/v1/account/resend-verification-public
   * Resend email verification (public — for login page when not authenticated)
   */
  static async resendVerificationPublic(req: Request, res: Response): Promise<void> {
    const { email } = req.body as ResendVerificationInput;
    const context: AuditContext = AuditService.getContextFromRequest(req);

    await AccountService.resendVerificationByEmail(email);
    await AuditService.log(AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT, context, `Email: ${email}`);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      data: { message: 'If an account with that email exists, a verification link has been sent.' },
    });
  }

  /**
   * POST /api/v1/account/resend-verification
   * Resend email verification (authenticated)
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email) {
      return void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const context: AuditContext = AuditService.getContextFromRequest(req);
    const result = await AccountService.sendVerificationEmail(userId, email);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to resend verification');
      return void res.status(500).json({
        success: false,
        error: 'Failed to send verification email',
      });
    }

    await AuditService.log(AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT, context);

    res.json({
      success: true,
      data: { message: 'Verification email sent.' },
    });
  }
}
