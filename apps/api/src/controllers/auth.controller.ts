// ===========================================
// Auth Controller
// ===========================================
// Handles HTTP requests for authentication.
// Validates input, calls service, formats responses.

import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuditService } from '../services/audit.service.js';
import { SettingsService } from '../services/settings.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import logger from '../lib/logger.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromCookie } from '../lib/cookies.js';
import { isServiceError } from '../lib/service-error.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const registrationEnabled = await SettingsService.get<boolean>('feature.registration_enabled', true);
    if (!registrationEnabled) {
      res.status(403).json({ success: false, error: 'Registration is currently disabled' });
      return;
    }

    const { email, password } = req.body as RegisterInput;

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await AuthService.register(email, password, metadata);

    if (!result.ok) {
      logger.warn({ error: result.error }, 'Registration failed');

      if (isServiceError(result.error, 'ALREADY_EXISTS')) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }

      res.status(500).json({ success: false, error: 'Registration failed' });
      return;
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.REGISTER, { ...context, userId: result.value.user.id });

    logger.info({ userId: result.value.user.id }, 'User registered');
    setRefreshTokenCookie(res, result.value.refreshToken);
    const { refreshToken: _rt, ...responseData } = result.value;
    res.status(201).json({ success: true, data: responseData });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as LoginInput;

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await AuthService.login(email, password, metadata);

    if (!result.ok) {
      const context = AuditService.getContextFromRequest(req);
      await AuditService.log(AUDIT_ACTIONS.LOGIN_FAILED, context, `Email: ${email}`, false);
      logger.warn({ email, error: result.error.toString() }, 'Login failed');

      // Handle account lockout
      if (isServiceError(result.error, 'ACCOUNT_LOCKED')) {
        const details = result.error.details;
        if (details?.lockedNow) {
          res.status(429).json({
            success: false,
            error: 'Too many failed attempts. Account has been temporarily locked.',
          });
        } else {
          res.status(429).json({
            success: false,
            error: `Account is locked. Try again in ${details?.minutesRemaining} minute(s).`,
          });
        }
        return;
      }

      // Handle invalid credentials with remaining attempts
      if (isServiceError(result.error, 'INVALID_CREDENTIALS')) {
        const remaining = result.error.details?.attemptsRemaining;
        const msg = remaining
          ? `Invalid email or password. ${remaining} attempt(s) remaining.`
          : 'Invalid email or password';
        res.status(401).json({ success: false, error: msg });
        return;
      }

      // Handle email not verified error
      if (isServiceError(result.error, 'EMAIL_NOT_VERIFIED')) {
        res.status(403).json({ success: false, error: 'EMAIL_NOT_VERIFIED' });
        return;
      }

      // Handle deactivated account
      if (isServiceError(result.error, 'ACCOUNT_DEACTIVATED')) {
        res.status(403).json({ success: false, error: 'Account is deactivated' });
        return;
      }

      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    if ('mfaRequired' in result.value && result.value.mfaRequired) {
      res.json({ success: true, data: result.value });
      return;
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.LOGIN_SUCCESS, { ...context, userId: result.value.user.id });

    logger.info({ userId: result.value.user.id }, 'User logged in');
    setRefreshTokenCookie(res, result.value.refreshToken);
    const { refreshToken: _rt, ...responseData } = result.value;
    res.json({ success: true, data: responseData });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromCookie(req.cookies as Record<string, string | undefined>)
      ?? (req.body as { refreshToken?: string }).refreshToken;

    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'No refresh token provided' });
      return;
    }

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await AuthService.refresh(refreshToken, metadata);

    if (!result.ok) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    setRefreshTokenCookie(res, result.value.refreshToken);
    res.json({ success: true, data: { accessToken: result.value.accessToken } });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromCookie(req.cookies as Record<string, string | undefined>)
      ?? (req.body as { refreshToken?: string }).refreshToken;

    if (refreshToken) {
      const result = await AuthService.logout(refreshToken);
      if (!result.ok) {
        logger.error({ error: result.error }, 'Logout failed');
      }
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.LOGOUT, context);

    clearRefreshTokenCookie(res);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const result = await AuthService.getUser(userId);

    if (!result.ok) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: result.value });
  }
}
