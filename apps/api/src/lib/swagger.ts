// ===========================================
// Swagger / OpenAPI Configuration
// ===========================================
// Generates OpenAPI 3.0 spec from JSDoc annotations
// and mounts Swagger UI at /api/docs (non-production only).

import { createRequire } from 'module';
import type { Express } from 'express';

// Use createRequire for CJS interop (same pattern as pino-http in app.ts)
const require = createRequire(import.meta.url);
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'Fullstack Template API',
    version: '0.0.1',
    description: 'REST API for the fullstack template application. Provides authentication, user management, RBAC, API keys, MFA, and admin functionality.',
  },
  servers: [
    { url: 'http://localhost:3000/api/v1', description: 'Local development' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication (register, login, logout, refresh)' },
    { name: 'Account', description: 'Password recovery and email verification' },
    { name: 'Users', description: 'User profile and preferences' },
    { name: 'Admin', description: 'Admin user and settings management' },
    { name: 'Roles', description: 'Role and permission management (RBAC)' },
    { name: 'API Keys', description: 'API key management and service accounts' },
    { name: 'MFA', description: 'Multi-factor authentication' },
    { name: 'Sessions', description: 'Session management' },
    { name: 'Settings', description: 'System settings (admin)' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          isAdmin: { type: 'boolean' },
          isActive: { type: 'boolean' },
          emailVerified: { type: 'boolean' },
          accountType: { type: 'string', enum: ['user', 'service'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userAgent: { type: 'string' },
          ipAddress: { type: 'string' },
          lastActive: { type: 'string', format: 'date-time' },
          isCurrent: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          isSystem: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          resource: { type: 'string' },
          action: { type: 'string' },
        },
      },
      ApiKey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          prefix: { type: 'string' },
          isActive: { type: 'boolean' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          action: { type: 'string' },
          resource: { type: 'string' },
          details: { type: 'object' },
          ipAddress: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Setting: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
          description: { type: 'string' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

const options = {
  definition,
  apis: ['./src/routes/*.ts', './src/lib/swagger.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Fullstack Template API Docs',
  }));

  // Raw JSON spec
  app.get('/api/docs/json', (_req, res) => {
    res.json(swaggerSpec);
  });
}
