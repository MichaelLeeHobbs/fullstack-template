// ===========================================
// Settings Controller
// ===========================================
// Admin API for managing system settings.

import type { Request, Response } from 'express';
import { z } from 'zod/v4';
import { SettingsService } from '../services/settings.service.js';
import logger from '../lib/logger.js';

const updateSettingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export class SettingsController {
  /**
   * GET /api/v1/admin/settings
   * List all settings grouped by category
   */
  static async list(_req: Request, res: Response): Promise<void> {
    const result = await SettingsService.getAll();

    if (!result.ok) {
      logger.error('Failed to list settings', { error: result.error.toString() });
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

    const result = await SettingsService.getAll();
    if (!result.ok) {
      return void res.status(500).json({
        success: false,
        error: 'Failed to retrieve setting',
      });
    }

    const setting = result.value.find((s) => s.key === key);
    if (!setting) {
      return void res.status(404).json({
        success: false,
        error: 'Setting not found',
      });
    }

    res.json({ success: true, data: setting });
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

    const parseResult = updateSettingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return void res.status(400).json({
        success: false,
        error: z.prettifyError(parseResult.error),
      });
    }

    const result = await SettingsService.set(key, parseResult.data.value);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({
          success: false,
          error: 'Setting not found',
        });
      }

      logger.error('Failed to update setting', {
        key,
        error: result.error.toString(),
      });
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

