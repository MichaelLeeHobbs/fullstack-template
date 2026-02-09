// ===========================================
// Settings Controller
// ===========================================
// Admin API for managing system settings.

import type { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service.js';
import type { UpdateSettingInput } from '../schemas/settings.schema.js';
import logger from '../lib/logger.js';

export class SettingsController {
  /**
   * GET /api/v1/admin/settings
   * List all settings grouped by category
   */
  static async list(_req: Request, res: Response): Promise<void> {
    const result = await SettingsService.getAll();

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list settings');
      return void res.status(500).json({
        success: false,
        error: 'Failed to retrieve settings',
      });
    }

    // Group by category for easier frontend consumption
    const grouped = result.value.reduce(
      (acc, setting) => {
        const category = setting.category || 'general';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(setting);
        return acc;
      },
      {} as Record<string, typeof result.value>
    );

    res.json({
      success: true,
      data: {
        settings: result.value,
        grouped,
      },
    });
  }

  /**
   * GET /api/v1/admin/settings/:key
   * Get a single setting by key
   */
  static async get(req: Request, res: Response): Promise<void> {
    const { key } = req.params;

    if (!key) {
      return void res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
    }

    const result = await SettingsService.getByKey(key);
    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({
          success: false,
          error: 'Setting not found',
        });
      }
      return void res.status(500).json({
        success: false,
        error: 'Failed to retrieve setting',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PATCH /api/v1/admin/settings/:key
   * Update a setting value
   */
  static async update(req: Request, res: Response): Promise<void> {
    const { key } = req.params;

    if (!key) {
      return void res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
    }

    const body = req.body as UpdateSettingInput;
    const result = await SettingsService.set(key, body.value);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({
          success: false,
          error: 'Setting not found',
        });
      }

      logger.error({ key, error: result.error }, 'Failed to update setting');
      return void res.status(500).json({
        success: false,
        error: 'Failed to update setting',
      });
    }

    res.json({
      success: true,
      data: { message: 'Setting updated successfully' },
    });
  }
}
