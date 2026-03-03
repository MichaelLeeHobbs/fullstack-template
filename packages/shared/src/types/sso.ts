// ===========================================
// SSO Types
// ===========================================

// ===========================================
// Protocol
// ===========================================

export const SsoProtocol = { OIDC: 'oidc', SAML: 'saml' } as const;
export type SsoProtocol = (typeof SsoProtocol)[keyof typeof SsoProtocol];

// ===========================================
// Provider Config Types
// ===========================================

export interface OidcProviderConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
}

export interface SamlProviderConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
}

// ===========================================
// Public Provider (login page display)
// ===========================================

export interface SsoProviderPublic {
  slug: string;
  name: string;
  protocol: SsoProtocol;
  iconUrl?: string | null;
}

// ===========================================
// Admin Provider (full details, secrets redacted)
// ===========================================

export interface SsoProviderAdmin {
  id: string;
  slug: string;
  name: string;
  protocol: SsoProtocol;
  isEnabled: boolean;
  config: Partial<OidcProviderConfig> | Partial<SamlProviderConfig>;
  allowedDomains: string[];
  autoCreateUsers: boolean;
  defaultRoleId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===========================================
// SSO Identity Info (user-facing)
// ===========================================

export interface SsoIdentityInfo {
  id: string;
  providerName: string;
  providerSlug: string;
  externalId: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
}

