// ===========================================
// Certificate Profile Controller
// ===========================================
// Handles certificate profile CRUD operations.

import type { Request, Response } from 'express';
import { CertificateProfileService } from '../services/certificate-profile.service.js';
import type { CreateProfileInput, UpdateProfileInput, ListProfileQuery } from '../schemas/certificate-profile.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class CertificateProfileController {
  /**
   * POST /api/v1/profiles
   * Create a new certificate profile
   */
  static async create(req: Request, res: Response): Promise<void> {
    const input = req.body as CreateProfileInput;
    const actorId = req.user?.id;

    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await CertificateProfileService.create(input, actorId, req.ip);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to create certificate profile');
      return void res.status(500).json({ success: false, error: 'Failed to create certificate profile' });
    }

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/profiles
   * List certificate profiles with pagination
   */
  static async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListProfileQuery;
    const result = await CertificateProfileService.list(query);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list certificate profiles');
      return void res.status(500).json({ success: false, error: 'Failed to list certificate profiles' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/profiles/:id
   * Get a single certificate profile by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Profile ID is required' });
    }

    const result = await CertificateProfileService.getById(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'PROFILE_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate profile not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get certificate profile' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PATCH /api/v1/profiles/:id
   * Update a certificate profile
   */
  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Profile ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const input = req.body as UpdateProfileInput;
    const result = await CertificateProfileService.update(id, input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'PROFILE_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate profile not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to update certificate profile' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * DELETE /api/v1/profiles/:id
   * Delete a certificate profile
   */
  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Profile ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await CertificateProfileService.delete(id, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'PROFILE_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate profile not found' });
      }
      if (isServiceError(result.error, 'SYSTEM_PROTECTED')) {
        return void res.status(400).json({ success: false, error: 'Built-in profiles cannot be deleted' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to delete certificate profile' });
    }

    res.json({ success: true, data: result.value });
  }
}
