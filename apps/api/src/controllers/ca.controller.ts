// ===========================================
// CA Controller
// ===========================================
// Handles certificate authority management operations.

import type { Request, Response } from 'express';
import { CaService } from '../services/ca.service.js';
import type { CreateCaInput, UpdateCaInput, ListCaQuery } from '../schemas/ca.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class CaController {
  /**
   * POST /api/v1/ca
   * Create a new CA (root or intermediate based on parentCaId)
   */
  static async create(req: Request, res: Response): Promise<void> {
    const input = req.body as CreateCaInput;
    const actorId = req.user?.id;

    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = input.parentCaId
      ? await CaService.createIntermediateCA(input, actorId, req.ip)
      : await CaService.createRootCA(input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Parent CA not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_ACTIVE')) {
        return void res.status(400).json({ success: false, error: 'Parent CA is not active' });
      }
      if (isServiceError(result.error, 'HIERARCHY_VIOLATION')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      if (isServiceError(result.error, 'INVALID_PASSPHRASE')) {
        return void res.status(400).json({ success: false, error: 'Invalid parent CA passphrase' });
      }
      logger.error({ error: result.error }, 'Failed to create CA');
      return void res.status(500).json({ success: false, error: 'Failed to create CA' });
    }

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/ca
   * List CAs with pagination and filters
   */
  static async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListCaQuery;
    const result = await CaService.list(query);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list CAs');
      return void res.status(500).json({ success: false, error: 'Failed to list CAs' });
    }

    const { cas, total } = result.value;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    res.json({
      success: true,
      data: {
        data: cas,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  }

  /**
   * GET /api/v1/ca/hierarchy
   * Get full CA hierarchy tree
   */
  static async getHierarchy(_req: Request, res: Response): Promise<void> {
    const result = await CaService.getHierarchy();

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to get CA hierarchy');
      return void res.status(500).json({ success: false, error: 'Failed to get CA hierarchy' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/ca/:id
   * Get a single CA by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }

    const result = await CaService.getById(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'CA not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get CA' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PATCH /api/v1/ca/:id
   * Update CA metadata
   */
  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const input = req.body as UpdateCaInput;
    const result = await CaService.update(id, input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'CA not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to update CA' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/ca/:id/suspend
   * Suspend an active CA
   */
  static async suspend(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await CaService.suspend(id, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'CA not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_ACTIVE')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      return void res.status(500).json({ success: false, error: 'Failed to suspend CA' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/ca/:id/retire
   * Retire a CA (permanent)
   */
  static async retire(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await CaService.retire(id, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'CA not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_ACTIVE')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      return void res.status(500).json({ success: false, error: 'Failed to retire CA' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/ca/:id/chain
   * Get the certificate chain for a CA
   */
  static async getChain(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }

    const result = await CaService.getChain(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'CA not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get certificate chain' });
    }

    res.json({ success: true, data: result.value });
  }
}
