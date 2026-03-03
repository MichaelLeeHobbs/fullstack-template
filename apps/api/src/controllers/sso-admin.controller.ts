// ===========================================
// SSO Admin Controller
// ===========================================
// Handles admin CRUD operations for SSO providers.

import type { Request, Response } from 'express';
import { SsoProviderService } from '../services/sso-provider.service.js';
import { AuditService } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import { isServiceError } from '../lib/service-error.js';
import logger from '../lib/logger.js';
import type { CreateSsoProviderInput, UpdateSsoProviderInput, SsoToggleInput } from '../schemas/sso.schema.js';

export class SsoAdminController {
  /**
   * GET /admin/sso/providers — List all SSO providers
   */
  static async listProviders(_req: Request, res: Response): Promise<void> {
    const result = await SsoProviderService.list();
    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list SSO providers');
      return void res.status(500).json({ success: false, error: 'Failed to list SSO providers' });
    }
    res.json({ success: true, data: result.value });
  }

  /**
   * GET /admin/sso/providers/:id — Get a single SSO provider
   */
  static async getProvider(req: Request, res: Response): Promise<void> {
    const result = await SsoProviderService.getById(req.params.id!);
    if (!result.ok) {
      if (isServiceError(result.error, 'SSO_PROVIDER_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'SSO provider not found' });
      }
      logger.error({ error: result.error }, 'Failed to get SSO provider');
      return void res.status(500).json({ success: false, error: 'Failed to get SSO provider' });
    }
    res.json({ success: true, data: result.value });
  }

  /**
   * POST /admin/sso/providers — Create a new SSO provider
   */
  static async createProvider(req: Request, res: Response): Promise<void> {
    const result = await SsoProviderService.create(req.body as CreateSsoProviderInput);
    if (!result.ok) {
      if (isServiceError(result.error, 'ALREADY_EXISTS')) {
        return void res.status(409).json({ success: false, error: result.error.message });
      }
      logger.error({ error: result.error }, 'Failed to create SSO provider');
      return void res.status(500).json({ success: false, error: 'Failed to create SSO provider' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(
      AUDIT_ACTIONS.SSO_PROVIDER_CREATED,
      context,
      `Provider: ${result.value.name} (${result.value.protocol})`,
    );

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * PATCH /admin/sso/providers/:id — Update an SSO provider
   */
  static async updateProvider(req: Request, res: Response): Promise<void> {
    const result = await SsoProviderService.update(req.params.id!, req.body as UpdateSsoProviderInput);
    if (!result.ok) {
      if (isServiceError(result.error, 'SSO_PROVIDER_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'SSO provider not found' });
      }
      if (isServiceError(result.error, 'ALREADY_EXISTS')) {
        return void res.status(409).json({ success: false, error: result.error.message });
      }
      logger.error({ error: result.error }, 'Failed to update SSO provider');
      return void res.status(500).json({ success: false, error: 'Failed to update SSO provider' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(
      AUDIT_ACTIONS.SSO_PROVIDER_UPDATED,
      context,
      `Provider: ${result.value.name}`,
    );

    res.json({ success: true, data: result.value });
  }

  /**
   * DELETE /admin/sso/providers/:id — Delete an SSO provider
   */
  static async deleteProvider(req: Request, res: Response): Promise<void> {
    const result = await SsoProviderService.delete(req.params.id!);
    if (!result.ok) {
      if (isServiceError(result.error, 'SSO_PROVIDER_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'SSO provider not found' });
      }
      logger.error({ error: result.error }, 'Failed to delete SSO provider');
      return void res.status(500).json({ success: false, error: 'Failed to delete SSO provider' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.SSO_PROVIDER_DELETED, context, `Provider: ${result.value.name}`);

    res.json({ success: true, data: { deleted: true } });
  }

  /**
   * PATCH /admin/sso/providers/:id/toggle — Enable/disable an SSO provider
   */
  static async toggleProvider(req: Request, res: Response): Promise<void> {
    const { isEnabled } = req.body as SsoToggleInput;
    const result = await SsoProviderService.setEnabled(req.params.id!, isEnabled);
    if (!result.ok) {
      if (isServiceError(result.error, 'SSO_PROVIDER_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'SSO provider not found' });
      }
      logger.error({ error: result.error }, 'Failed to toggle SSO provider');
      return void res.status(500).json({ success: false, error: 'Failed to toggle SSO provider' });
    }

    const context = AuditService.getContextFromRequest(req);
    const action = isEnabled ? AUDIT_ACTIONS.SSO_PROVIDER_ENABLED : AUDIT_ACTIONS.SSO_PROVIDER_DISABLED;
    await AuditService.log(action, context, `Provider: ${result.value.name}`);

    res.json({ success: true, data: result.value });
  }
}
