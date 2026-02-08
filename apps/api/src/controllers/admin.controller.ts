// ===========================================
// Admin Controller
// ===========================================
// Handles admin operations for user management.

import type { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { AuditService } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import type { ListUsersQuery, UpdateUserInput, ListAuditLogsQuery } from '../schemas/admin.schema.js';
import logger from '../lib/logger.js';

export class AdminController {
  /**
   * GET /api/v1/admin/users
   * List users with pagination and filtering
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    const result = await AdminService.listUsers(req.query as unknown as ListUsersQuery);

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to list users' );
      return void res.status(500).json({
        success: false,
        error: 'Failed to list users',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/admin/users/:id
   * Get single user details
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const result = await AdminService.getUser(id);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      return void res.status(500).json({
        success: false,
        error: 'Failed to get user',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PATCH /api/v1/admin/users/:id
   * Update user status (isActive, isAdmin)
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!id) {
      return void res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const body = req.body as UpdateUserInput;

    // Prevent self-demotion
    if (id === adminId && body.isAdmin === false) {
      return void res.status(400).json({
        success: false,
        error: 'Cannot remove your own admin privileges',
      });
    }

    const result = await AdminService.updateUser(id, body);

    if (!result.ok) {
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      return void res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
    }

    // Audit log - include email for better readability
    const context = AuditService.getContextFromRequest(req);
    const targetEmail = result.value.email;

    if (body.isActive === false) {
      await AuditService.log(AUDIT_ACTIONS.USER_DEACTIVATED, context, `${targetEmail}`);
    } else if (body.isActive === true) {
      await AuditService.log(AUDIT_ACTIONS.USER_ACTIVATED, context, `${targetEmail}`);
    }

    if (body.isAdmin === true) {
      await AuditService.log(AUDIT_ACTIONS.ADMIN_GRANTED, context, `${targetEmail}`);
    } else if (body.isAdmin === false) {
      await AuditService.log(AUDIT_ACTIONS.ADMIN_REVOKED, context, `${targetEmail}`);
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * DELETE /api/v1/admin/users/:id
   * Delete a user (cannot delete self)
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!id) {
      return void res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    if (!adminId) {
      return void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user email before deletion for audit log
    const userResult = await AdminService.getUser(id);
    const targetEmail = userResult.ok ? userResult.value.email : id;

    const result = await AdminService.deleteUser(id, adminId);

    if (!result.ok) {
      if (result.error.message?.includes('Cannot delete your own')) {
        return void res.status(400).json({
          success: false,
          error: result.error.message,
        });
      }
      if (result.error.message?.includes('not found')) {
        return void res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      return void res.status(500).json({
        success: false,
        error: 'Failed to delete user',
      });
    }

    // Audit log
    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.USER_DELETED, context, `${targetEmail}`);

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/admin/audit-logs
   * List audit logs with pagination
   */
  static async listAuditLogs(req: Request, res: Response): Promise<void> {
    const { page, limit, userId, sortBy, sortOrder } = req.query as unknown as ListAuditLogsQuery;
    const result = await AdminService.listAuditLogs(page, limit, userId, sortBy, sortOrder);

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to list audit logs');
      return void res.status(500).json({
        success: false,
        error: 'Failed to list audit logs',
      });
    }

    res.json({ success: true, data: result.value });
  }
}
