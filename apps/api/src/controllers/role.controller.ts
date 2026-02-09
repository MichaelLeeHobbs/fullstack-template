// ===========================================
// Role Controller
// ===========================================
// Handles role and permission management endpoints.

import type { Request, Response } from 'express';
import { RoleService } from '../services/role.service.js';
import { UserRoleService } from '../services/user-role.service.js';
import { PermissionService } from '../services/permission.service.js';
import { AuditService } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import type { CreateRoleInput, UpdateRoleInput, SetPermissionsInput, SetUserRolesInput } from '../schemas/role.schema.js';
import logger from '../lib/logger.js';
import { isServiceError } from '../lib/service-error.js';

export class RoleController {
  // ===========================================
  // Permissions
  // ===========================================

  /**
   * GET /api/v1/roles/permissions
   * List all available permissions
   */
  static async listPermissions(req: Request, res: Response): Promise<void> {
    const result = await PermissionService.getAll();

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to list permissions');
      return void res.status(500).json({
        success: false,
        error: 'Failed to list permissions',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/roles/permissions/grouped
   * List all permissions grouped by resource
   */
  static async listPermissionsGrouped(req: Request, res: Response): Promise<void> {
    const result = await PermissionService.getAllGrouped();

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to list permissions');
      return void res.status(500).json({
        success: false,
        error: 'Failed to list permissions',
      });
    }

    res.json({ success: true, data: result.value });
  }

  // ===========================================
  // Roles
  // ===========================================

  /**
   * GET /api/v1/roles
   * List all roles with their permissions
   */
  static async listRoles(req: Request, res: Response): Promise<void> {
    const result = await RoleService.getAllWithPermissions();

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to list roles');
      return void res.status(500).json({
        success: false,
        error: 'Failed to list roles',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * GET /api/v1/roles/:id
   * Get role details with permissions
   */
  static async getRole(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({
        success: false,
        error: 'Role ID is required',
      });
    }

    const result = await RoleService.getById(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({
          success: false,
          error: 'Role not found',
        });
      }
      logger.error({ error: result.error },'Failed to get role');
      return void res.status(500).json({
        success: false,
        error: 'Failed to get role',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * POST /api/v1/roles
   * Create a new role
   */
  static async createRole(req: Request, res: Response): Promise<void> {
    const result = await RoleService.create(req.body as CreateRoleInput);

    if (!result.ok) {
      if (isServiceError(result.error, 'ALREADY_EXISTS')) {
        return void res.status(409).json({
          success: false,
          error: result.error.message,
        });
      }
      logger.error({ error: result.error },'Failed to create role');
      return void res.status(500).json({
        success: false,
        error: 'Failed to create role',
      });
    }

    // Audit log
    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.ROLE_CREATED, context, result.value.name);

    res.status(201).json({ success: true, data: result.value });
  }

  /**
   * PUT /api/v1/roles/:id
   * Update a role
   */
  static async updateRole(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({
        success: false,
        error: 'Role ID is required',
      });
    }

    const result = await RoleService.update(id, req.body as UpdateRoleInput);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({
          success: false,
          error: 'Role not found',
        });
      }
      if (isServiceError(result.error, 'SYSTEM_PROTECTED')) {
        return void res.status(403).json({
          success: false,
          error: result.error.message,
        });
      }
      if (isServiceError(result.error, 'ALREADY_EXISTS')) {
        return void res.status(409).json({
          success: false,
          error: result.error.message,
        });
      }
      logger.error({ error: result.error },'Failed to update role');
      return void res.status(500).json({
        success: false,
        error: 'Failed to update role',
      });
    }

    // Audit log
    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.ROLE_UPDATED, context, result.value.name);

    res.json({ success: true, data: result.value });
  }

  /**
   * DELETE /api/v1/roles/:id
   * Delete a role
   */
  static async deleteRole(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({
        success: false,
        error: 'Role ID is required',
      });
    }

    // Get role name before deletion for audit log
    const roleResult = await RoleService.getById(id);
    const roleName = roleResult.ok ? roleResult.value.name : id;

    const result = await RoleService.delete(id);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({
          success: false,
          error: 'Role not found',
        });
      }
      if (isServiceError(result.error, 'SYSTEM_PROTECTED')) {
        return void res.status(403).json({
          success: false,
          error: result.error.message,
        });
      }
      logger.error({ error: result.error },'Failed to delete role');
      return void res.status(500).json({
        success: false,
        error: 'Failed to delete role',
      });
    }

    // Audit log
    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.ROLE_DELETED, context, roleName);

    res.json({ success: true, data: { deleted: true } });
  }

  /**
   * PUT /api/v1/roles/:id/permissions
   * Set permissions for a role (replaces existing)
   */
  static async setRolePermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      return void res.status(400).json({
        success: false,
        error: 'Role ID is required',
      });
    }

    const body = req.body as SetPermissionsInput;
    const result = await RoleService.setPermissions(id, body.permissionIds);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({
          success: false,
          error: 'Role not found',
        });
      }
      if (isServiceError(result.error, 'SYSTEM_PROTECTED')) {
        return void res.status(403).json({
          success: false,
          error: result.error.message,
        });
      }
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        return void res.status(400).json({
          success: false,
          error: result.error.message,
        });
      }
      logger.error({ error: result.error },'Failed to set role permissions');
      return void res.status(500).json({
        success: false,
        error: 'Failed to set role permissions',
      });
    }

    // Get updated role for response
    const updatedRole = await RoleService.getById(id);

    // Audit log
    const context = AuditService.getContextFromRequest(req);
    const roleName = updatedRole.ok ? updatedRole.value.name : id;
    await AuditService.log(AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED, context, roleName);

    res.json({ success: true, data: updatedRole.ok ? updatedRole.value : { id } });
  }

  // ===========================================
  // User Roles
  // ===========================================

  /**
   * GET /api/v1/roles/users/:userId
   * Get roles for a specific user
   */
  static async getUserRoles(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!userId) {
      return void res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const result = await UserRoleService.getUserRoles(userId);

    if (!result.ok) {
      logger.error({ error: result.error },'Failed to get user roles');
      return void res.status(500).json({
        success: false,
        error: 'Failed to get user roles',
      });
    }

    res.json({ success: true, data: result.value });
  }

  /**
   * PUT /api/v1/roles/users/:userId
   * Set roles for a user (replaces existing)
   */
  static async setUserRoles(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!userId) {
      return void res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const body = req.body as SetUserRolesInput;
    const result = await UserRoleService.setRoles(userId, body.roleIds);

    if (!result.ok) {
      if (isServiceError(result.error, 'NOT_FOUND')) {
        return void res.status(404).json({
          success: false,
          error: result.error.message,
        });
      }
      if (isServiceError(result.error, 'INVALID_INPUT')) {
        return void res.status(400).json({
          success: false,
          error: result.error.message,
        });
      }
      logger.error({ error: result.error },'Failed to set user roles');
      return void res.status(500).json({
        success: false,
        error: 'Failed to set user roles',
      });
    }

    // Get updated roles for response
    const updatedRoles = await UserRoleService.getUserRoles(userId);

    // Audit log
    const context = AuditService.getContextFromRequest(req);
    await AuditService.log(AUDIT_ACTIONS.USER_ROLES_UPDATED, context, userId);

    res.json({ success: true, data: updatedRoles.ok ? updatedRoles.value : [] });
  }
}
