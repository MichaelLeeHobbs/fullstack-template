// ===========================================
// Certificate Login Controller
// ===========================================
// Handles HTTP requests for mTLS certificate-based authentication,
// certificate binding via attach codes, and cert status management.

import type { Request, Response } from 'express';
import { CertLoginService } from '../services/cert-login.service.js';
import { extractClientCert } from '../lib/extract-client-cert.js';
import { setRefreshTokenCookie } from '../lib/cookies.js';
import { isServiceError } from '../lib/service-error.js';
import type { AttachCertificateInput } from '../schemas/cert-login.schema.js';
import logger from '../lib/logger.js';

export class CertLoginController {
  /**
   * POST /cert-login
   * Authenticate using a client certificate (headers set by NGINX).
   */
  static async login(req: Request, res: Response): Promise<void> {
    const cert = extractClientCert(req.headers);

    if (!cert) {
      res.status(401).json({ success: false, error: 'No client certificate detected' });
      return;
    }

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await CertLoginService.loginWithCertificate(cert, metadata);

    if (!result.ok) {
      if (isServiceError(result.error, 'CERT_NOT_AUTHENTICATED')) {
        res.status(401).json({ success: false, error: 'Client certificate was not authenticated' });
        return;
      }
      if (isServiceError(result.error, 'CERT_NOT_BOUND')) {
        res.status(401).json({ success: false, error: 'Certificate is not bound to any account' });
        return;
      }
      if (isServiceError(result.error, 'ACCOUNT_DEACTIVATED')) {
        res.status(403).json({ success: false, error: 'Account is deactivated' });
        return;
      }

      logger.error({ error: result.error }, 'Certificate login failed');
      res.status(500).json({ success: false, error: 'Certificate login failed' });
      return;
    }

    logger.info({ userId: result.value.user.id }, 'User logged in via certificate');
    setRefreshTokenCookie(res, result.value.refreshToken);
    const { refreshToken: _rt, ...responseData } = result.value;
    res.json({ success: true, data: responseData });
  }

  /**
   * POST /cert-attach/code
   * Generate a one-time attach code for the authenticated user.
   */
  static async generateAttachCode(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const result = await CertLoginService.generateAttachCode(userId);

    if (!result.ok) {
      if (isServiceError(result.error, 'RATE_LIMITED')) {
        res.status(429).json({ success: false, error: 'Too many attach codes generated. Try again later.' });
        return;
      }

      logger.error({ error: result.error }, 'Failed to generate attach code');
      res.status(500).json({ success: false, error: 'Failed to generate attach code' });
      return;
    }

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * POST /cert-attach
   * Attach a client certificate to a user account using a one-time code.
   */
  static async attachCertificate(req: Request, res: Response): Promise<void> {
    const { code, label } = req.body as AttachCertificateInput;

    const cert = extractClientCert(req.headers);
    if (!cert) {
      res.status(401).json({ success: false, error: 'No client certificate detected' });
      return;
    }

    const result = await CertLoginService.attachCertificate(code, cert, label, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'ATTACH_CODE_INVALID')) {
        res.status(400).json({ success: false, error: 'Attach code is invalid or already used' });
        return;
      }
      if (isServiceError(result.error, 'ATTACH_CODE_EXPIRED')) {
        res.status(400).json({ success: false, error: 'Attach code has expired' });
        return;
      }
      if (isServiceError(result.error, 'CERT_NOT_AUTHENTICATED')) {
        res.status(401).json({ success: false, error: 'Client certificate was not authenticated' });
        return;
      }
      if (isServiceError(result.error, 'ALREADY_EXISTS')) {
        res.status(409).json({ success: false, error: 'This certificate is already bound to an account' });
        return;
      }

      logger.error({ error: result.error }, 'Failed to attach certificate');
      res.status(500).json({ success: false, error: 'Failed to attach certificate' });
      return;
    }

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * GET /cert-status
   * Get all certificate bindings for the authenticated user.
   */
  static async getCertStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const result = await CertLoginService.getCertStatus(userId);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to get certificate status');
      res.status(500).json({ success: false, error: 'Failed to get certificate status' });
      return;
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * DELETE /cert-binding/:id
   * Remove a certificate binding for the authenticated user.
   */
  static async removeBinding(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const result = await CertLoginService.removeBinding(id, userId, req.ip);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        res.status(404).json({ success: false, error: 'Certificate binding not found' });
        return;
      }

      logger.error({ error: result.error }, 'Failed to remove certificate binding');
      res.status(500).json({ success: false, error: 'Failed to remove certificate binding' });
      return;
    }

    res.json({ success: true, data: { message: 'Certificate binding removed' } });
  }
}
