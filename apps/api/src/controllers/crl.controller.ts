// ===========================================
// CRL Controller
// ===========================================
// Handles CRL generation, retrieval (JSON and raw DER), and history.

import type { Request, Response } from 'express';
import { CrlService } from '../services/crl.service.js';
import type { GenerateCrlInput, ListCrlQuery } from '../schemas/crl.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class CrlController {
  /**
   * POST /api/v1/ca/:id/crl
   * Generate a new CRL for the given CA
   */
  static async generate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const input = req.body as GenerateCrlInput;
    const result = await CrlService.generate(id, input.caPassphrase, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate authority not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_ACTIVE')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      if (isServiceError(result.error, 'INVALID_PASSPHRASE')) {
        return void res.status(400).json({ success: false, error: 'Invalid CA passphrase' });
      }
      logger.error({ error: result.error }, 'Failed to generate CRL');
      return void res.status(500).json({ success: false, error: 'Failed to generate CRL' });
    }

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/ca/:id/crl/latest
   * Get the latest CRL for a CA (JSON response)
   */
  static async getLatest(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }

    const result = await CrlService.getLatest(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'No CRL found for this certificate authority' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get CRL' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/ca/:id/crl/latest.der
   * Get the latest CRL for a CA as a DER-encoded binary download.
   * This endpoint is typically public (no auth) for CRL distribution points.
   */
  static async getLatestDer(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }

    const result = await CrlService.getLatest(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'No CRL found for this certificate authority' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get CRL' });
    }

    // Convert PEM to DER
    const pemBody = result.value.crlPem
      .replace(/-----BEGIN X509 CRL-----/g, '')
      .replace(/-----END X509 CRL-----/g, '')
      .replace(/\s/g, '');

    const derBuffer = Buffer.from(pemBody, 'base64');

    res.setHeader('Content-Type', 'application/pkix-crl');
    res.setHeader('Content-Disposition', `attachment; filename="crl-${result.value.crlNumber}.der"`);
    res.send(derBuffer);
  }

  /**
   * GET /api/v1/ca/:id/crl/history
   * Get paginated CRL history for a CA
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'CA ID is required' });
    }

    const query = req.query as unknown as ListCrlQuery;
    const result = await CrlService.getHistory(id, query.page, query.limit);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to get CRL history');
      return void res.status(500).json({ success: false, error: 'Failed to get CRL history' });
    }

    res.json({ success: true, data: result.value });
  }
}
