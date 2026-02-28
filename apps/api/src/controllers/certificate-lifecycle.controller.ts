// ===========================================
// Certificate Lifecycle Controller
// ===========================================
// Handles certificate revocation and renewal operations.

import type { Request, Response } from 'express';
import { CertificateLifecycleService } from '../services/certificate-lifecycle.service.js';
import type { RevokeCertificateInput, RenewCertificateInput } from '../schemas/revocation.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class CertificateLifecycleController {
  /**
   * POST /api/v1/certificates/:id/revoke
   * Revoke an active certificate
   */
  static async revoke(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const input = req.body as RevokeCertificateInput;
    const result = await CertificateLifecycleService.revoke(id, input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CERT_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate not found' });
      }
      if (isServiceError(result.error, 'CERT_ALREADY_REVOKED')) {
        return void res.status(409).json({ success: false, error: 'Certificate is already revoked' });
      }
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      logger.error({ error: result.error }, 'Failed to revoke certificate');
      return void res.status(500).json({ success: false, error: 'Failed to revoke certificate' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/certificates/:id/renew
   * Renew an existing certificate
   */
  static async renew(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const actorId = req.user?.id;

    if (!id) {
      return void res.status(400).json({ success: false, error: 'Certificate ID is required' });
    }
    if (!actorId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const input = req.body as RenewCertificateInput;
    const result = await CertificateLifecycleService.renew(id, input, actorId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'CERT_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Certificate not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'Issuing certificate authority not found' });
      }
      if (isServiceError(result.error, 'CA_NOT_ACTIVE')) {
        return void res.status(400).json({ success: false, error: 'Issuing certificate authority is not active' });
      }
      if (isServiceError(result.error, 'INVALID_PASSPHRASE')) {
        return void res.status(400).json({ success: false, error: 'Invalid CA passphrase' });
      }
      logger.error({ error: result.error }, 'Failed to renew certificate');
      return void res.status(500).json({ success: false, error: 'Failed to renew certificate' });
    }

    res.status(201).json({ success: true, data: result.value });
  }
}
