// ===========================================
// Auth Controller
// ===========================================
// Handles HTTP requests for authentication.
// Validates input, calls service, formats responses.

import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import type { RegisterInput, LoginInput, RefreshInput } from '../schemas/auth.schema.js';
import logger from '../lib/logger.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as RegisterInput;

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await AuthService.register(email, password, metadata);

    if (!result.ok) {
      logger.warn({ error: result.error }, 'Registration failed');

      if (result.error.message?.includes('already exists')) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }

      res.status(500).json({ success: false, error: 'Registration failed' });
      return;
    }

    logger.info({ userId: result.value.user.id }, 'User registered');
    res.status(201).json({ success: true, data: result.value });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as LoginInput;

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await AuthService.login(email, password, metadata);

    if (!result.ok) {
      logger.warn({ email, error: result.error.toString() }, 'Login failed');

      // Handle account lockout
      if (result.error.message?.startsWith('ACCOUNT_LOCKED:')) {
        const minutes = result.error.message.split(':')[1];
        res.status(429).json({
          success: false,
          error: `Account is locked. Try again in ${minutes} minute(s).`,
        });
        return;
      }
      if (result.error.message === 'ACCOUNT_LOCKED_NOW') {
        res.status(429).json({
          success: false,
          error: 'Too many failed attempts. Account has been temporarily locked.',
        });
        return;
      }

      // Handle invalid credentials with remaining attempts
      if (result.error.message?.startsWith('INVALID_CREDENTIALS:')) {
        const remaining = result.error.message.split(':')[1];
        const msg = remaining
          ? `Invalid email or password. ${remaining} attempt(s) remaining.`
          : 'Invalid email or password';
        res.status(401).json({ success: false, error: msg });
        return;
      }

      // Handle email not verified error
      if (result.error.message === 'EMAIL_NOT_VERIFIED') {
        res.status(403).json({ success: false, error: 'EMAIL_NOT_VERIFIED' });
        return;
      }

      // Handle deactivated account
      if (result.error.message?.includes('deactivated')) {
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

    logger.info({ userId: result.value.user.id }, 'User logged in');
    res.json({ success: true, data: result.value });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshInput;

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await AuthService.refresh(refreshToken, metadata);

    if (!result.ok) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    res.json({ success: true, data: result.value });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshInput;

    const result = await AuthService.logout(refreshToken);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Logout failed');
      res.status(500).json({ success: false, error: 'Logout failed' });
      return;
    }

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
