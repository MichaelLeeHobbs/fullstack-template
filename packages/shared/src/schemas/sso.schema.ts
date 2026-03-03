// ===========================================
// SSO Validation Schemas (Shared)
// ===========================================

import { z } from 'zod/v4';

// ===========================================
// OIDC Config Schema
// ===========================================

export const oidcConfigSchema = z.object({
  issuerUrl: z.url('Must be a valid URL'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  scopes: z.array(z.string()).default(['openid', 'profile', 'email']),
  authorizationEndpoint: z.url().optional(),
  tokenEndpoint: z.url().optional(),
  userinfoEndpoint: z.url().optional(),
});

// ===========================================
// SAML Config Schema
// ===========================================

export const samlConfigSchema = z.object({
  entryPoint: z.url('Must be a valid URL'),
  issuer: z.string().min(1, 'Issuer is required'),
  cert: z.string().min(1, 'Certificate is required'),
  signatureAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
  attributeMapping: z.object({
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
  }).optional(),
});

// ===========================================
// Provider Schemas
// ===========================================

const ssoSlugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const baseSsoProviderFields = {
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(100).regex(ssoSlugRegex, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Name is required').max(255),
  isEnabled: z.boolean().optional(),
  allowedDomains: z.array(z.string()).optional(),
  autoCreateUsers: z.boolean().optional(),
  defaultRoleId: z.string().uuid().nullable().optional(),
};

export const createSsoProviderSchema = z.discriminatedUnion('protocol', [
  z.object({
    ...baseSsoProviderFields,
    protocol: z.literal('oidc'),
    config: oidcConfigSchema,
  }),
  z.object({
    ...baseSsoProviderFields,
    protocol: z.literal('saml'),
    config: samlConfigSchema,
  }),
]);

export const updateSsoProviderSchema = z.object({
  slug: z.string().min(2).max(100).regex(ssoSlugRegex, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  name: z.string().min(1).max(255).optional(),
  config: z.union([oidcConfigSchema.partial(), samlConfigSchema.partial()]).optional(),
  isEnabled: z.boolean().optional(),
  allowedDomains: z.array(z.string()).optional(),
  autoCreateUsers: z.boolean().optional(),
  defaultRoleId: z.string().uuid().nullable().optional(),
});

export const ssoSlugParamSchema = z.object({
  slug: z.string().regex(ssoSlugRegex),
});

export const ssoExchangeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

// ===========================================
// Type Exports
// ===========================================

export type CreateSsoProviderInput = z.infer<typeof createSsoProviderSchema>;
export type UpdateSsoProviderInput = z.infer<typeof updateSsoProviderSchema>;
export type SsoSlugParam = z.infer<typeof ssoSlugParamSchema>;
export type SsoExchangeInput = z.infer<typeof ssoExchangeSchema>;
