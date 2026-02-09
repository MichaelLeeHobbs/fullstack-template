// ===========================================
// MFA Controller
// ===========================================
// Handles HTTP requests for multi-factor authentication.

import type { Request, Response } from 'express';
import { MfaService } from '../services/mfa.service.js';
import { AuthService } from '../services/auth.service.js';
import { AuditService } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import type {
  MfaVerifySetupInput,
  MfaVerifyLoginInput,
  MfaDisableInput,
  MfaRegenerateBackupCodesInput,
} from '../schemas/mfa.schema.js';
import logger from '../lib/logger.js';
import { setRefreshTokenCookie } from '../lib/cookies.js';
import { isServiceError } from '../lib/service-error.js';

export class MfaController {
  static async getMethods(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const result = await MfaService.getEnabledMethods(userId);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to get MFA methods');
      res.status(500).json({ success: false, error: 'Failed to get MFA methods' });
      return;
    }

    res.json({ success: true, data: result.value });
  }

  static async setupTotp(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const email = req.user!.email;

    const result = await MfaService.setupTotp(userId, email);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to setup TOTP');
      res.status(500).json({ success: false, error: 'Failed to setup TOTP' });
      return;
    }

    res.json({ success: true, data: result.value });
  }

  static async verifySetup(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { code } = req.body as MfaVerifySetupInput;

    const result = await MfaService.verifyAndEnableTotp(userId, code);

    if (!result.ok) {
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        res.status(400).json({ success: false, error: result.error.message });
        return;
      }
      logger.error({ error: result.error }, 'Failed to verify TOTP setup');
      res.status(500).json({ success: false, error: 'Failed to verify TOTP setup' });
      return;
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.MFA_ENABLED, context, 'TOTP');

    res.json({ success: true, data: result.value });
  }

  static async verifyLogin(req: Request, res: Response): Promise<void> {
    const { tempToken, method, code } = req.body as MfaVerifyLoginInput;
    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };

    const result = await AuthService.verifyMfaAndLogin(tempToken, method, code, metadata);

    if (!result.ok) {
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        res.status(401).json({ success: false, error: 'Invalid MFA code' });
        return;
      }
      logger.error({ error: result.error }, 'MFA login verification failed');
      res.status(401).json({ success: false, error: 'MFA verification failed' });
      return;
    }

    setRefreshTokenCookie(res, result.value.refreshToken);
    const { refreshToken: _rt, ...responseData } = result.value;
    res.json({ success: true, data: responseData });
  }

  static async disable(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { method, code } = req.body as MfaDisableInput;

    const result = await MfaService.disable(userId, method, code);

    if (!result.ok) {
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        res.status(400).json({ success: false, error: result.error.message });
        return;
      }
      logger.error({ error: result.error }, 'Failed to disable MFA');
      res.status(500).json({ success: false, error: 'Failed to disable MFA' });
      return;
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.MFA_DISABLED, context, method);

    res.json({ success: true, data: { message: 'MFA disabled' } });
  }

  static async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { method, code } = req.body as MfaRegenerateBackupCodesInput;

    const result = await MfaService.regenerateBackupCodes(userId, method, code);

    if (!result.ok) {
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        res.status(400).json({ success: false, error: result.error.message });
        return;
      }
      logger.error({ error: result.error }, 'Failed to regenerate backup codes');
      res.status(500).json({ success: false, error: 'Failed to regenerate backup codes' });
      return;
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.MFA_BACKUP_REGENERATED, context);

    res.json({ success: true, data: result.value });
  }
}
