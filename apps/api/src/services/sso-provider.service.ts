// ===========================================
// SSO Provider Service
// ===========================================
// CRUD operations for SSO provider configurations.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { db } from '../lib/db.js';
import { ssoProviders, type SsoProvider } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { CreateSsoProviderInput, UpdateSsoProviderInput } from '../schemas/sso.schema.js';
import type { SsoProviderAdmin, SsoProviderPublic, OidcProviderConfig, SamlProviderConfig } from '@fullstack-template/shared';

// ===========================================
// Config Type
// ===========================================

type ProviderConfig = OidcProviderConfig | SamlProviderConfig;

function isOidcConfig(config: unknown): config is OidcProviderConfig {
  return typeof config === 'object' && config !== null && 'clientId' in config;
}

// ===========================================
// Helpers
// ===========================================

function encryptConfig(protocol: string, config: ProviderConfig): ProviderConfig {
  if (protocol === 'oidc' && isOidcConfig(config) && config.clientSecret) {
    return { ...config, clientSecret: encrypt(config.clientSecret) };
  }
  return config;
}

function decryptConfig(protocol: string, config: ProviderConfig): ProviderConfig {
  if (protocol === 'oidc' && isOidcConfig(config) && config.clientSecret) {
    return { ...config, clientSecret: decrypt(config.clientSecret) };
  }
  return config;
}

function redactConfig(protocol: string, config: ProviderConfig): Partial<OidcProviderConfig> | Partial<SamlProviderConfig> {
  if (protocol === 'oidc' && isOidcConfig(config)) {
    return { ...config, clientSecret: '••••••••' };
  }
  return config;
}

function toAdminView(provider: SsoProvider): SsoProviderAdmin {
  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    protocol: provider.protocol as SsoProviderAdmin['protocol'],
    isEnabled: provider.isEnabled,
    config: redactConfig(provider.protocol, provider.config),
    allowedDomains: provider.allowedDomains,
    autoCreateUsers: provider.autoCreateUsers,
    defaultRoleId: provider.defaultRoleId,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}

// ===========================================
// Service
// ===========================================

export class SsoProviderService {
  static async list(): Promise<Result<SsoProviderAdmin[]>> {
    return tryCatch(async () => {
      const providers = await db
        .select()
        .from(ssoProviders)
        .orderBy(ssoProviders.name);
      return providers.map(toAdminView);
    });
  }

  static async getById(id: string): Promise<Result<SsoProviderAdmin>> {
    return tryCatch(async () => {
      const [provider] = await db
        .select()
        .from(ssoProviders)
        .where(eq(ssoProviders.id, id));
      if (!provider) throw new ServiceError('SSO_PROVIDER_NOT_FOUND', 'SSO provider not found');
      return toAdminView(provider);
    });
  }

  static async getBySlug(slug: string): Promise<Result<SsoProvider>> {
    return tryCatch(async () => {
      const [provider] = await db
        .select()
        .from(ssoProviders)
        .where(eq(ssoProviders.slug, slug));
      if (!provider) throw new ServiceError('SSO_PROVIDER_NOT_FOUND', 'SSO provider not found');
      // Decrypt secrets for auth flow usage
      const decryptedConfig = decryptConfig(provider.protocol, provider.config);
      return { ...provider, config: decryptedConfig };
    });
  }

  static async listEnabled(): Promise<Result<SsoProviderPublic[]>> {
    return tryCatch(async () => {
      return await db
        .select({
          slug: ssoProviders.slug,
          name: ssoProviders.name,
          protocol: ssoProviders.protocol,
        })
        .from(ssoProviders)
        .where(eq(ssoProviders.isEnabled, true))
        .orderBy(ssoProviders.name) as SsoProviderPublic[];
    });
  }

  static async create(input: CreateSsoProviderInput): Promise<Result<SsoProviderAdmin>> {
    return tryCatch(async () => {
      // Check slug uniqueness
      const [existing] = await db
        .select()
        .from(ssoProviders)
        .where(eq(ssoProviders.slug, input.slug));
      if (existing) throw new ServiceError('ALREADY_EXISTS', 'A provider with this slug already exists');

      const encryptedConfig = encryptConfig(input.protocol, input.config);

      const [provider] = await db
        .insert(ssoProviders)
        .values({
          slug: input.slug,
          name: input.name,
          protocol: input.protocol,
          config: encryptedConfig as OidcProviderConfig | SamlProviderConfig,
          isEnabled: input.isEnabled ?? false,
          allowedDomains: input.allowedDomains ?? [],
          autoCreateUsers: input.autoCreateUsers ?? true,
          defaultRoleId: input.defaultRoleId ?? null,
        })
        .returning();

      if (!provider) throw new Error('Failed to create SSO provider');
      return toAdminView(provider);
    });
  }

  static async update(id: string, input: UpdateSsoProviderInput): Promise<Result<SsoProviderAdmin>> {
    return tryCatch(async () => {
      const [existing] = await db
        .select()
        .from(ssoProviders)
        .where(eq(ssoProviders.id, id));
      if (!existing) throw new ServiceError('SSO_PROVIDER_NOT_FOUND', 'SSO provider not found');

      // Check slug uniqueness if changing
      if (input.slug && input.slug !== existing.slug) {
        const [slugTaken] = await db
          .select()
          .from(ssoProviders)
          .where(eq(ssoProviders.slug, input.slug));
        if (slugTaken) throw new ServiceError('ALREADY_EXISTS', 'A provider with this slug already exists');
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.slug !== undefined) updates.slug = input.slug;
      if (input.name !== undefined) updates.name = input.name;
      if (input.isEnabled !== undefined) updates.isEnabled = input.isEnabled;
      if (input.allowedDomains !== undefined) updates.allowedDomains = input.allowedDomains;
      if (input.autoCreateUsers !== undefined) updates.autoCreateUsers = input.autoCreateUsers;
      if (input.defaultRoleId !== undefined) updates.defaultRoleId = input.defaultRoleId;

      if (input.config) {
        // Merge with existing config
        const existingConfig = decryptConfig(existing.protocol, existing.config);
        const mergedConfig = { ...existingConfig, ...input.config } as ProviderConfig;
        updates.config = encryptConfig(existing.protocol, mergedConfig);
      }

      const [provider] = await db
        .update(ssoProviders)
        .set(updates)
        .where(eq(ssoProviders.id, id))
        .returning();

      if (!provider) throw new Error('Failed to update SSO provider');
      return toAdminView(provider);
    });
  }

  static async delete(id: string): Promise<Result<{ name: string }>> {
    return tryCatch(async () => {
      const [deleted] = await db
        .delete(ssoProviders)
        .where(eq(ssoProviders.id, id))
        .returning({ name: ssoProviders.name });
      if (!deleted) throw new ServiceError('SSO_PROVIDER_NOT_FOUND', 'SSO provider not found');
      return deleted;
    });
  }

  static async setEnabled(id: string, isEnabled: boolean): Promise<Result<SsoProviderAdmin>> {
    return tryCatch(async () => {
      const [provider] = await db
        .update(ssoProviders)
        .set({ isEnabled, updatedAt: new Date() })
        .where(eq(ssoProviders.id, id))
        .returning();

      if (!provider) throw new ServiceError('SSO_PROVIDER_NOT_FOUND', 'SSO provider not found');
      return toAdminView(provider);
    });
  }
}
