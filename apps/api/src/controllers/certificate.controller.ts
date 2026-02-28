// ===========================================
// Certificate Controller
// ===========================================
// Handles certificate issuance, listing, download, and chain retrieval.

import type { Request, Response } from 'express';
import { CertificateService } from '../services/certificate.service.js';
import type { IssueCertificateInput, ListCertificateQuery, DownloadCertificateInput } from '../schemas/certificate.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class CertificateController {
  /**
   * POST /api/v1/certificates/issue
   * Issue a new certificate
   */
  static async issue(req: Request, res: Response): Promise<void> {
    const input = req.body as IssueCertificateInput;
    const actorId = req.user?.id;

    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await CertificateService.issueDirect(input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate authority not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_ACTIVE')) {
        return void res.status(400).json({ success: false, error: 'Certificate authority is not active' });
      }
      if (isServiceError(result.error, 'PROFILE_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate profile not found' });
      }
      if (isServiceError(result.error, 'PROFILE_CONSTRAINT_VIOLATION')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      if (isServiceError(result.error, 'INVALID_PASSPHRASE')) {
        return void res.status(400).json({ success: false, error: 'Invalid CA passphrase' });
      }
      logger.error({ error: result.error }, 'Failed to issue certificate');
      return void res.status(500).json({ success: false, error: 'Failed to issue certificate' });
    }

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/certificates
   * List certificates with pagination and filters
   */
  static async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListCertificateQuery;
    const result = await CertificateService.list(query);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list certificates');
      return void res.status(500).json({ success: false, error: 'Failed to list certificates' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/certificates/:id
   * Get a single certificate by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate ID is required' });
    }

    const result = await CertificateService.getById(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'CERT_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get certificate' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/certificates/:id/download
   * Download a certificate in the specified format
   */
  static async download(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const options = req.query as unknown as DownloadCertificateInput;
    const result = await CertificateService.download(id, options, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CERT_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate not found' });
      }
      if (isServiceError(result.error, 'INVALID_PASSPHRASE')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      logger.error({ error: result.error }, 'Failed to download certificate');
      return void res.status(500).json({ success: false, error: 'Failed to download certificate' });
    }

    const { data, contentType, filename } = result.value;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (Buffer.isBuffer(data)) {
      res.send(data);
    } else {
      res.send(data);
    }
  }

  /**
   * GET /api/v1/certificates/:id/chain
   * Get the certificate chain for a certificate
   */
  static async getChain(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate ID is required' });
    }

    const result = await CertificateService.getChain(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'CERT_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Issuing CA not found in chain' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get certificate chain' });
    }

    res.json({ success: true, data: result.value });
  }
}
