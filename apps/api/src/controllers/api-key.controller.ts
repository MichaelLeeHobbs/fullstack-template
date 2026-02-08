// ===========================================
// API Key Controller
// ===========================================
// Handles API key CRUD and service account management.

import type { Request, Response } from 'express';
import { ApiKeyService } from '../services/api-key.service.js';
import { ServiceAccountService } from '../services/service-account.service.js';
import { AuditService } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import type {
  CreateApiKeyInput,
  UpdateApiKeyPermissionsInput,
  ListApiKeysQuery,
  CreateServiceAccountInput,
} from '../schemas/api-key.schema.js';
import logger from '../lib/logger.js';

export class ApiKeyController {
  // ===========================================
  // Self-Service
  // ===========================================

  /**
   * GET /api/v1/api-keys/my
   * List current user's API keys
   */
  static async listMy(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await ApiKeyService.listByUser(userId);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list user API keys');
      return void res.status(500).json({ success: false, error: 'Failed to list API keys' });
    }

    res.json({ success: true, data: result.value });
  }

  // ===========================================
  // Admin API Key Management
  // ===========================================

  /**
   * POST /api/v1/api-keys
   * Create a new API key
   */
  static async create(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const isAdmin = req.user?.isAdmin ?? false;
    if (!userId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = req.body as CreateApiKeyInput;
    const result = await ApiKeyService.create(body, userId, isAdmin);

    if (!result.ok) {
      if (result.error.message?.includes('Cannot assign permission')) {
        return void res.status(403).json({ success: false, error: result.error.message });
      }
      if (result.error.message?.includes('invalid permission')) {
        return void res.status(400).json({ success: false, error: result.error.message });
      }
      logger.error({ error: result.error }, 'Failed to create API key');
      return void res.status(500).json({ success: false, error: 'Failed to create API key' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.API_KEY_CREATED, context, result.value.apiKey.name);

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/api-keys
   * List all API keys (admin)
   */
  static async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListApiKeysQuery;
    const result = await ApiKeyService.listAll(query);

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list API keys');
      return void res.status(500).json({ success: false, error: 'Failed to list API keys' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/api-keys/:id
   * Get API key by ID
   */
  static async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) return void res.status(400).json({ success: false, error: 'API key ID is required' });
    const result = await ApiKeyService.getById(id);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({ success: false, error: 'API key not found' });
      }
      return void res.status(500).json({ success: false, error: 'Failed to get API key' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PUT /api/v1/api-keys/:id/permissions
   * Set permissions for an API key
   */
  static async setPermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) return void res.status(400).json({ success: false, error: 'API key ID is required' });
    const userId = req.user?.id;
    const isAdmin = req.user?.isAdmin ?? false;
    if (!userId) {
      return void res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = req.body as UpdateApiKeyPermissionsInput;
    const result = await ApiKeyService.setPermissions(id, body.permissionIds, userId, isAdmin);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({ success: false, error: 'API key not found' });
      }
      if (result.error.message?.includes('Cannot assign permission')) {
        return void res.status(403).json({ success: false, error: result.error.message });
      }
      logger.error({ error: result.error }, 'Failed to set API key permissions');
      return void res.status(500).json({ success: false, error: 'Failed to update permissions' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.API_KEY_PERMISSIONS_UPDATED, context, id);

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/api-keys/:id/revoke
   * Revoke an API key
   */
  static async revoke(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) return void res.status(400).json({ success: false, error: 'API key ID is required' });
    const result = await ApiKeyService.revoke(id);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({ success: false, error: 'API key not found' });
      }
      logger.error({ error: result.error }, 'Failed to revoke API key');
      return void res.status(500).json({ success: false, error: 'Failed to revoke API key' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.API_KEY_REVOKED, context, id);

    res.json({ success: true, data: result.value });
  }

  /**
   * DELETE /api/v1/api-keys/:id
   * Delete an API key
   */
  static async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) return void res.status(400).json({ success: false, error: 'API key ID is required' });
    const result = await ApiKeyService.delete(id);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({ success: false, error: 'API key not found' });
      }
      logger.error({ error: result.error }, 'Failed to delete API key');
      return void res.status(500).json({ success: false, error: 'Failed to delete API key' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.API_KEY_DELETED, context, id);

    res.json({ success: true, data: result.value });
  }

  // ===========================================
  // Service Accounts
  // ===========================================

  /**
   * GET /api/v1/api-keys/service-accounts
   * List service accounts
   */
  static async listServiceAccounts(_req: Request, res: Response): Promise<void> {
    const result = await ServiceAccountService.list();

    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list service accounts');
      return void res.status(500).json({ success: false, error: 'Failed to list service accounts' });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/api-keys/service-accounts
   * Create a service account
   */
  static async createServiceAccount(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateServiceAccountInput;
    const result = await ServiceAccountService.create(body.email);

    if (!result.ok) {
      if (result.error.message?.includes('already exists')) {
        return void res.status(409).json({ success: false, error: 'Email already exists' });
      }
      logger.error({ error: result.error }, 'Failed to create service account');
      return void res.status(500).json({ success: false, error: 'Failed to create service account' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.SERVICE_ACCOUNT_CREATED, context, result.value.email);

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * DELETE /api/v1/api-keys/service-accounts/:id
   * Delete a service account
   */
  static async deleteServiceAccount(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) return void res.status(400).json({ success: false, error: 'Service account ID is required' });
    const result = await ServiceAccountService.delete(id);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({ success: false, error: 'Service account not found' });
      }
      logger.error({ error: result.error }, 'Failed to delete service account');
      return void res.status(500).json({ success: false, error: 'Failed to delete service account' });
    }

    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.SERVICE_ACCOUNT_DELETED, context, id);

    res.json({ success: true, data: result.value });
  }
}
