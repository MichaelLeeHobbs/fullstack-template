// ===========================================
// SSO Service
// ===========================================
// Core SSO authentication logic: build auth URLs, handle callbacks,
// resolve users, manage auth codes.

import { randomBytes } from 'crypto';
import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import {
  users,
  ssoProviders,
  ssoIdentities,
  ssoAuthCodes,
  userRoles,
  type SsoProvider,
} from '../db/schema/index.js';
import { eq, and, lt } from 'drizzle-orm';
import { AuthService, type SessionMetadata } from './auth.service.js';
import { PermissionService } from './permission.service.js';
import type { OidcProviderConfig, SamlProviderConfig, SsoIdentityInfo, UserPreferences } from '@fullstack-template/shared';

// ===========================================
// Types
// ===========================================

export interface SsoExchangeResult {
  user: {
    id: string;
    email: string;
    isAdmin: boolean;
    preferences: UserPreferences;
    permissions: string[];
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export interface NormalizedSsoIdentity {
  externalId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profile: Record<string, unknown>;
}

// ===========================================
// OIDC helpers (openid-client v6)
// ===========================================

async function buildOidcAuthUrl(
  config: OidcProviderConfig,
  callbackUrl: string,
  state: string,
  nonce: string,
): Promise<string> {
  const { discovery, buildAuthorizationUrl } = await import('openid-client');

  const oidcConfig = await discovery(
    new URL(config.issuerUrl),
    config.clientId,
    config.clientSecret,
  );

  const redirectTo = buildAuthorizationUrl(oidcConfig, {
    redirect_uri: callbackUrl,
    scope: config.scopes?.join(' ') || 'openid profile email',
    state,
    nonce,
  });

  return redirectTo.toString();
}

async function handleOidcExchange(
  config: OidcProviderConfig,
  code: string,
  callbackUrl: string,
): Promise<NormalizedSsoIdentity> {
  const oidcClient = await import('openid-client');
  const { discovery, authorizationCodeGrant, fetchUserInfo } = oidcClient;

  const oidcConfig = await discovery(
    new URL(config.issuerUrl),
    config.clientId,
    config.clientSecret,
  );

  const tokens = await authorizationCodeGrant(oidcConfig, new URL(`${callbackUrl}?code=${code}`));

  const claims = tokens.claims();

  // Try ID token claims first, fall back to userinfo endpoint
  if (claims) {
    const email = claims.email as string | undefined;
    if (!email) throw new Error('No email claim in OIDC response');

    return {
      externalId: claims.sub,
      email,
      firstName: (claims.given_name ?? undefined) as string | undefined,
      lastName: (claims.family_name ?? undefined) as string | undefined,
      displayName: (claims.name ?? undefined) as string | undefined,
      profile: claims as unknown as Record<string, unknown>,
    };
  }

  // Fallback: use userinfo endpoint
  const userInfo = await fetchUserInfo(oidcConfig, tokens.access_token, oidcClient.skipSubjectCheck);
  const email = userInfo.email;
  if (!email) throw new Error('No email in OIDC userinfo response');

  return {
    externalId: userInfo.sub,
    email,
    firstName: (userInfo.given_name ?? undefined) as string | undefined,
    lastName: (userInfo.family_name ?? undefined) as string | undefined,
    displayName: (userInfo.name ?? undefined) as string | undefined,
    profile: userInfo as unknown as Record<string, unknown>,
  };
}

// ===========================================
// SAML helpers (@node-saml/node-saml v5)
// ===========================================

async function createSamlClient(config: SamlProviderConfig, callbackUrl: string) {
  const { SAML } = await import('@node-saml/node-saml');

  return new SAML({
    entryPoint: config.entryPoint,
    issuer: config.issuer,
    idpCert: config.cert,
    callbackUrl,
    wantAuthnResponseSigned: false,
    wantAssertionsSigned: true,
    signatureAlgorithm: config.signatureAlgorithm || 'sha256',
  });
}

async function buildSamlAuthUrl(
  config: SamlProviderConfig,
  callbackUrl: string,
  state: string,
): Promise<string> {
  const saml = await createSamlClient(config, callbackUrl);
  return await saml.getAuthorizeUrlAsync(state, undefined, {});
}

async function handleSamlResponse(
  config: SamlProviderConfig,
  samlResponse: string,
  callbackUrl: string,
): Promise<NormalizedSsoIdentity> {
  const saml = await createSamlClient(config, callbackUrl);

  const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });
  if (!profile) throw new Error('Invalid SAML response');

  const mapping = config.attributeMapping || {};
  const attrs = profile as Record<string, unknown>;

  const email = (attrs[mapping.email || 'email'] ??
    attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
    profile.nameID) as string;

  if (!email) throw new Error('No email found in SAML response');

  return {
    externalId: profile.nameID || email,
    email,
    firstName: attrs[mapping.firstName || 'firstName'] as string | undefined,
    lastName: attrs[mapping.lastName || 'lastName'] as string | undefined,
    displayName: attrs[mapping.displayName || 'displayName'] as string | undefined,
    profile: attrs,
  };
}

// ===========================================
// Service
// ===========================================

export class SsoService {
  static async buildAuthUrl(
    provider: SsoProvider,
    callbackUrl: string,
    state: string,
    nonce: string,
  ): Promise<Result<string>> {
    return tryCatch(async () => {
      if (provider.protocol === 'oidc') {
        return await buildOidcAuthUrl(provider.config as OidcProviderConfig, callbackUrl, state, nonce);
      } else if (provider.protocol === 'saml') {
        return await buildSamlAuthUrl(provider.config as SamlProviderConfig, callbackUrl, state);
      }

      throw new Error(`Unsupported SSO protocol: ${provider.protocol}`);
    });
  }

  static async handleOidcCallback(
    provider: SsoProvider,
    code: string,
    callbackUrl: string,
  ): Promise<Result<NormalizedSsoIdentity>> {
    return tryCatch(async () => {
      const config = provider.config as unknown as OidcProviderConfig;
      return await handleOidcExchange(config, code, callbackUrl);
    });
  }

  static async handleSamlCallback(
    provider: SsoProvider,
    samlResponse: string,
    callbackUrl: string,
  ): Promise<Result<NormalizedSsoIdentity>> {
    return tryCatch(async () => {
      const config = provider.config as unknown as SamlProviderConfig;
      return await handleSamlResponse(config, samlResponse, callbackUrl);
    });
  }

  static async resolveUser(
    provider: SsoProvider,
    identity: NormalizedSsoIdentity,
  ): Promise<Result<{ userId: string; created: boolean }>> {
    return tryCatch(async () => {
      // 1. Lookup existing SSO identity
      const [existingIdentity] = await db
        .select()
        .from(ssoIdentities)
        .where(
          and(
            eq(ssoIdentities.providerId, provider.id),
            eq(ssoIdentities.externalId, identity.externalId),
          ),
        );

      if (existingIdentity) {
        // Update last login and profile
        await db
          .update(ssoIdentities)
          .set({
            lastLoginAt: new Date(),
            email: identity.email,
            profile: identity.profile,
            updatedAt: new Date(),
          })
          .where(eq(ssoIdentities.id, existingIdentity.id));

        return { userId: existingIdentity.userId, created: false };
      }

      // 2. Lookup user by email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, identity.email.toLowerCase()));

      if (existingUser) {
        // Link SSO identity to existing user
        await db.insert(ssoIdentities).values({
          userId: existingUser.id,
          providerId: provider.id,
          externalId: identity.externalId,
          email: identity.email,
          profile: identity.profile,
          lastLoginAt: new Date(),
        });

        return { userId: existingUser.id, created: false };
      }

      // 3. Check if auto-creation is allowed
      if (!provider.autoCreateUsers) {
        throw new ServiceError('SSO_USER_CREATION_DISABLED', 'Automatic user creation is disabled for this provider');
      }

      // 4. Check allowed domains
      if (provider.allowedDomains.length > 0) {
        const emailDomain = identity.email.split('@')[1]?.toLowerCase();
        if (!emailDomain || !provider.allowedDomains.includes(emailDomain)) {
          throw new ServiceError('SSO_DOMAIN_NOT_ALLOWED', `Email domain is not allowed for this SSO provider`);
        }
      }

      // 5. Create user in transaction
      const userId = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            email: identity.email.toLowerCase(),
            passwordHash: null,
            emailVerified: true,
          })
          .returning({ id: users.id });

        if (!newUser) throw new Error('Failed to create user');

        // Link SSO identity
        await tx.insert(ssoIdentities).values({
          userId: newUser.id,
          providerId: provider.id,
          externalId: identity.externalId,
          email: identity.email,
          profile: identity.profile,
          lastLoginAt: new Date(),
        });

        // Assign default role if configured
        if (provider.defaultRoleId) {
          await tx.insert(userRoles).values({
            userId: newUser.id,
            roleId: provider.defaultRoleId,
          });
        }

        return newUser.id;
      });

      return { userId, created: true };
    });
  }

  static async createAuthCode(userId: string, metadata: SessionMetadata): Promise<Result<string>> {
    return tryCatch(async () => {
      // Clean up expired codes
      await db
        .delete(ssoAuthCodes)
        .where(lt(ssoAuthCodes.expiresAt, new Date()));

      const code = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

      await db.insert(ssoAuthCodes).values({
        code,
        userId,
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        expiresAt,
      });

      return code;
    });
  }

  static async exchangeAuthCode(
    code: string,
    metadata: SessionMetadata,
  ): Promise<Result<SsoExchangeResult>> {
    return tryCatch(async () => {
      const [authCode] = await db
        .select()
        .from(ssoAuthCodes)
        .where(eq(ssoAuthCodes.code, code));

      if (!authCode) {
        throw new ServiceError('SSO_AUTH_CODE_INVALID', 'Invalid SSO authentication code');
      }

      if (authCode.expiresAt < new Date()) {
        // Clean up expired code
        await db.delete(ssoAuthCodes).where(eq(ssoAuthCodes.id, authCode.id));
        throw new ServiceError('SSO_AUTH_CODE_EXPIRED', 'SSO authentication code has expired');
      }

      // Delete the code (single-use)
      await db.delete(ssoAuthCodes).where(eq(ssoAuthCodes.id, authCode.id));

      // Get user
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          isAdmin: users.isAdmin,
          preferences: users.preferences,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, authCode.userId));

      if (!user) throw new Error('User not found');

      // Check if active
      if (!user.isActive) {
        throw new ServiceError('ACCOUNT_DEACTIVATED', 'Account is deactivated');
      }

      // Update lastLoginAt
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Create tokens and fetch permissions in parallel
      const [tokens, permissions] = await Promise.all([
        AuthService.createTokens(user.id, metadata),
        PermissionService.getUserPermissions(user.id),
      ]);

      return {
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          preferences: user.preferences,
          permissions: Array.from(permissions),
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  static async getUserIdentities(userId: string): Promise<Result<SsoIdentityInfo[]>> {
    return tryCatch(async () => {
      const identities = await db
        .select({
          id: ssoIdentities.id,
          externalId: ssoIdentities.externalId,
          email: ssoIdentities.email,
          lastLoginAt: ssoIdentities.lastLoginAt,
          createdAt: ssoIdentities.createdAt,
          providerName: ssoProviders.name,
          providerSlug: ssoProviders.slug,
        })
        .from(ssoIdentities)
        .innerJoin(ssoProviders, eq(ssoIdentities.providerId, ssoProviders.id))
        .where(eq(ssoIdentities.userId, userId));

      return identities.map((i) => ({
        id: i.id,
        providerName: i.providerName,
        providerSlug: i.providerSlug,
        externalId: i.externalId,
        email: i.email || '',
        lastLoginAt: i.lastLoginAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
      }));
    });
  }

  static async unlinkIdentity(userId: string, identityId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const [deleted] = await db
        .delete(ssoIdentities)
        .where(
          and(
            eq(ssoIdentities.id, identityId),
            eq(ssoIdentities.userId, userId),
          ),
        )
        .returning({ id: ssoIdentities.id });

      if (!deleted) throw new ServiceError('NOT_FOUND', 'SSO identity not found');
    });
  }
}
