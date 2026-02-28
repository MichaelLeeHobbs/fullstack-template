// ===========================================
// CSR Controller
// ===========================================
// Handles certificate signing request submission, listing, approval,
// and rejection.

import type { Request, Response } from 'express';
import { CsrService } from '../services/csr.service.js';
import type { SubmitCsrInput, ApproveCsrInput, RejectCsrInput, ListCsrQuery } from '../schemas/csr.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class CsrController {
  /**
   * POST /api/v1/certificates/requests
   * Submit a new CSR
   */
  static async submit(req: Request, res: Response): Promise<void> {
    const input = req.body as SubmitCsrInput;
    const actorId = req.user?.id;

    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await CsrService.submit(input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Target certificate authority not found' });
      }
      logger.error({ error: result.error }, 'Failed to submit CSR');
      return void res.status(500).json({ success: false, error: 'Failed to submit certificate request' });
    }

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/certificates/requests
   * List CSRs with pagination and filters
   */
  static async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListCsrQuery;
    const result = await CsrService.list(query);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list certificate requests');
      return void res.status(500).json({ success: false, error: 'Failed to list certificate requests' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/certificates/requests/:id
   * Get a single CSR by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate request ID is required' });
    }

    const result = await CsrService.getById(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate request not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get certificate request' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/certificates/requests/:id/approve
   * Approve a pending CSR and issue the certificate
   */
  static async approve(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate request ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const input = req.body as ApproveCsrInput;
    const result = await CsrService.approve(id, input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate request not found' });
      }
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Target certificate authority not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_ACTIVE')) {
        return void res.status(400).json({ success: false, error: 'Target certificate authority is not active' });
      }
      if (isServiceError(result.error, 'INVALID_PASSPHRASE')) {
        return void res.status(400).json({ success: false, error: 'Invalid CA passphrase' });
      }
      logger.error({ error: result.error }, 'Failed to approve CSR');
      return void res.status(500).json({ success: false, error: 'Failed to approve certificate request' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/certificates/requests/:id/reject
   * Reject a pending CSR with a reason
   */
  static async reject(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate request ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const input = req.body as RejectCsrInput;
    const result = await CsrService.reject(id, input.reason, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate request not found' });
      }
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      logger.error({ error: result.error }, 'Failed to reject CSR');
      return void res.status(500).json({ success: false, error: 'Failed to reject certificate request' });
    }

    res.json({ success: true, data: result.value });
  }
}
