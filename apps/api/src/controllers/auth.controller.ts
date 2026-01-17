// ===========================================
// Auth Controller
// ===========================================
// Handles HTTP requests for authentication.
// Validates input, calls service, formats responses.

import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema.js';
import logger from '../lib/logger.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      });
      return;
    }

    const result = await AuthService.register(parseResult.data.email, parseResult.data.password);

    if (!result.ok) {
      logger.warn('Registration failed', { error: result.error.message });

      if (result.error.message?.includes('already exists')) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }

      res.status(500).json({ success: false, error: 'Registration failed' });
      return;
    }

    logger.info('User registered', { userId: result.value.user.id });
    res.status(201).json({ success: true, data: result.value });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      });
      return;
    }

    const result = await AuthService.login(parseResult.data.email, parseResult.data.password);

    if (!result.ok) {
      logger.warn('Login failed', { email: parseResult.data.email });
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    logger.info('User logged in', { userId: result.value.user.id });
    res.json({ success: true, data: result.value });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      });
      return;
    }

    const result = await AuthService.refresh(parseResult.data.refreshToken);

    if (!result.ok) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    res.json({ success: true, data: result.value });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      });
      return;
    }

    const result = await AuthService.logout(parseResult.data.refreshToken);

    if (!result.ok) {
      logger.error('Logout failed', { error: result.error.message });
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

