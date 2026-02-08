// ===========================================
// User Controller
// ===========================================
// Handles user profile and preferences endpoints.

import type { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';
import type { ChangePasswordInput, UpdatePreferencesInput } from '../schemas/user.schema.js';
import logger from '../lib/logger.js';

export class UserController {
  /**
   * GET /api/v1/users/me
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      return void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await UserService.getProfile(userId);

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to get profile');
      return void res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PATCH /api/v1/users/me/password
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      return void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    const result = await UserService.changePassword(userId, currentPassword, newPassword);

    if (!result.ok) {
      const errorMsg = result.error.message || 'Failed to change password';

      if (errorMsg.includes('incorrect')) {
        return void res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      logger.error({ error: result.error },'Failed to change password');
      return void res.status(500).json({
        success: false,
        error: 'Failed to change password',
      });
    }

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  }

  /**
   * GET /api/v1/users/me/preferences
   * Get user preferences
   */
  static async getPreferences(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      return void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await UserService.getPreferences(userId);

    if (!result.ok) {
      return void res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PATCH /api/v1/users/me/preferences
   * Update user preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      return void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await UserService.updatePreferences(userId, req.body as UpdatePreferencesInput);

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to update preferences');
      return void res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
      });
    }

    res.json({ success: true, data: result.value });
  }
}
