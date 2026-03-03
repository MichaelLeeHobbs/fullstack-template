// ===========================================
// SSO Controller (Public Auth Flow)
// ===========================================
// Handles SSO initiation, callbacks, and auth code exchange.

import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { SsoProviderService } from '../services/sso-provider.service.js';
import { SsoService } from '../services/sso.service.js';
import { SettingsService } from '../services/settings.service.js';
import { AuditService } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../db/schema/audit.js';
import { signSsoStateToken, verifySsoStateToken, type SsoStatePayload } from '../lib/jwt.js';
import { setRefreshTokenCookie } from '../lib/cookies.js';
import { config } from '../config/index.js';
import { isServiceError } from '../lib/service-error.js';
import logger from '../lib/logger.js';
import type { NormalizedSsoIdentity } from '../services/sso.service.js';
import type { SsoExchangeInput } from '../schemas/sso.schema.js';
import type { SsoProvider } from '../db/schema/index.js';
import type { Result } from 'stderr-lib';

function buildCallbackUrl(req: Request, path: string): string {
  return `${req.protocol}://${req.get('host')}${path}`;
}

export class SsoController {
  /**
   * GET /sso/providers — List enabled SSO providers for the login page
   */
  static async listProviders(_req: Request, res: Response): Promise<void> {
    const result = await SsoProviderService.listEnabled();
    if (!result.ok) {
      logger.error({ error: result.error }, 'Failed to list SSO providers');
      return void res.status(500).json({ success: false, error: 'Failed to list SSO providers' });
    }
    res.json({ success: true, data: result.value });
  }

  /**
   * GET /sso/:slug/login — Initiate SSO flow (redirect to IdP)
   */
  static async initiateLogin(req: Request, res: Response): Promise<void> {
    // Check feature flag
    const ssoEnabled = await SettingsService.get<boolean>('feature.sso_enabled', false);
    if (!ssoEnabled) {
      return void res.status(403).json({ success: false, error: 'SSO is not enabled' });
    }

    const { slug } = req.params;
    const providerResult = await SsoProviderService.getBySlug(slug!);
    if (!providerResult.ok) {
      if (isServiceError(providerResult.error, 'SSO_PROVIDER_NOT_FOUND')) {
        return void res.status(404).json({ success: false, error: 'SSO provider not found' });
      }
      logger.error({ error: providerResult.error }, 'Failed to get SSO provider');
      return void res.status(500).json({ success: false, error: 'Failed to initiate SSO' });
    }

    const provider = providerResult.value;
    if (!provider.isEnabled) {
      return void res.status(400).json({ success: false, error: 'SSO provider is not enabled' });
    }

    // Build callback URL
    const callbackPath = provider.protocol === 'oidc'
      ? '/api/v1/sso/oidc/callback'
      : '/api/v1/sso/saml/callback';
    const callbackUrl = buildCallbackUrl(req, callbackPath);

    // Sign state token
    const nonce = randomBytes(16).toString('hex');
    const returnUrl = req.query.returnUrl as string | undefined;
    const state = signSsoStateToken({
      providerSlug: slug!,
      nonce,
      purpose: 'sso',
      returnUrl,
    });

    const authUrlResult = await SsoService.buildAuthUrl(provider, callbackUrl, state, nonce);
    if (!authUrlResult.ok) {
      logger.error({ error: authUrlResult.error, slug }, 'Failed to build SSO auth URL');
      return void res.status(500).json({ success: false, error: 'Failed to initiate SSO' });
    }

    res.redirect(authUrlResult.value);
  }

  /**
   * Shared post-authentication flow for both OIDC and SAML callbacks.
   */
  private static async completeCallback(
    req: Request,
    res: Response,
    statePayload: SsoStatePayload,
    provider: SsoProvider,
    identityResult: Result<NormalizedSsoIdentity>,
  ): Promise<void> {
    if (!identityResult.ok) {
      logger.error({ error: identityResult.error }, 'SSO callback identity resolution failed');
      return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=callback_failed`);
    }

    const userResult = await SsoService.resolveUser(provider, identityResult.value);
    if (!userResult.ok) {
      if (isServiceError(userResult.error, 'SSO_USER_CREATION_DISABLED')) {
        return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=user_creation_disabled`);
      }
      if (isServiceError(userResult.error, 'SSO_DOMAIN_NOT_ALLOWED')) {
        return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=domain_not_allowed`);
      }
      logger.error({ error: userResult.error }, 'Failed to resolve SSO user');
      return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=resolve_failed`);
    }

    const metadata = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const codeResult = await SsoService.createAuthCode(userResult.value.userId, metadata);
    if (!codeResult.ok) {
      logger.error({ error: codeResult.error }, 'Failed to create SSO auth code');
      return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=internal`);
    }

    // Audit
    const context = AuditService.getContextFromRequest(req);
    const auditPromises = [
      AuditService.log(
        AUDIT_ACTIONS.SSO_LOGIN_SUCCESS,
        { ...context, userId: userResult.value.userId },
        `Provider: ${statePayload.providerSlug}`,
      ),
    ];
    if (userResult.value.created) {
      auditPromises.push(
        AuditService.log(
          AUDIT_ACTIONS.SSO_USER_CREATED,
          { ...context, userId: userResult.value.userId },
          `Provider: ${statePayload.providerSlug}`,
        ),
      );
    }
    await Promise.all(auditPromises);

    const returnUrl = statePayload.returnUrl ? `&returnUrl=${encodeURIComponent(statePayload.returnUrl)}` : '';
    res.redirect(`${config.FRONTEND_URL}/sso/callback?code=${codeResult.value}${returnUrl}`);
  }

  /**
   * GET /sso/oidc/callback — OIDC callback from IdP
   */
  static async oidcCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error: oidcError } = req.query;

    if (oidcError) {
      logger.warn({ error: oidcError }, 'OIDC IdP returned error');
      return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=idp_error`);
    }

    if (!state || !code) {
      return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=missing_params`);
    }

    try {
      const statePayload = verifySsoStateToken(state as string);
      const providerResult = await SsoProviderService.getBySlug(statePayload.providerSlug);
      if (!providerResult.ok) {
        return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=provider_not_found`);
      }

      const provider = providerResult.value;
      const callbackUrl = buildCallbackUrl(req, '/api/v1/sso/oidc/callback');
      const identityResult = await SsoService.handleOidcCallback(provider, code as string, callbackUrl);

      await SsoController.completeCallback(req, res, statePayload, provider, identityResult);
    } catch (err) {
      logger.error({ error: err }, 'OIDC callback error');
      const context = AuditService.getContextFromRequest(req);
      await AuditService.log(AUDIT_ACTIONS.SSO_LOGIN_FAILED, context, String(err), false);
      res.redirect(`${config.FRONTEND_URL}/sso/callback?error=callback_failed`);
    }
  }

  /**
   * POST /sso/saml/callback — SAML ACS endpoint from IdP
   */
  static async samlCallback(req: Request, res: Response): Promise<void> {
    const { SAMLResponse, RelayState } = req.body as { SAMLResponse?: string; RelayState?: string };

    if (!SAMLResponse || !RelayState) {
      return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=missing_params`);
    }

    try {
      const statePayload = verifySsoStateToken(RelayState);
      const providerResult = await SsoProviderService.getBySlug(statePayload.providerSlug);
      if (!providerResult.ok) {
        return void res.redirect(`${config.FRONTEND_URL}/sso/callback?error=provider_not_found`);
      }

      const provider = providerResult.value;
      const callbackUrl = buildCallbackUrl(req, '/api/v1/sso/saml/callback');
      const identityResult = await SsoService.handleSamlCallback(provider, SAMLResponse, callbackUrl);

      await SsoController.completeCallback(req, res, statePayload, provider, identityResult);
    } catch (err) {
      logger.error({ error: err }, 'SAML callback error');
      const context = AuditService.getContextFromRequest(req);
      await AuditService.log(AUDIT_ACTIONS.SSO_LOGIN_FAILED, context, String(err), false);
      res.redirect(`${config.FRONTEND_URL}/sso/callback?error=callback_failed`);
    }
  }

  /**
   * POST /sso/exchange — Exchange auth code for JWT tokens
   */
  static async exchangeCode(req: Request, res: Response): Promise<void> {
    const { code } = req.body as SsoExchangeInput;

    const metadata = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const result = await SsoService.exchangeAuthCode(code, metadata);

    if (!result.ok) {
      if (isServiceError(result.error, 'SSO_AUTH_CODE_INVALID')) {
        return void res.status(400).json({ success: false, error: 'Invalid authentication code' });
      }
      if (isServiceError(result.error, 'SSO_AUTH_CODE_EXPIRED')) {
        return void res.status(400).json({ success: false, error: 'Authentication code has expired' });
      }
      if (isServiceError(result.error, 'ACCOUNT_DEACTIVATED')) {
        return void res.status(403).json({ success: false, error: 'Account is deactivated' });
      }
      logger.error({ error: result.error }, 'SSO code exchange failed');
      return void res.status(500).json({ success: false, error: 'Failed to exchange authentication code' });
    }

    setRefreshTokenCookie(res, result.value.refreshToken);
    const { refreshToken: _rt, ...responseData } = result.value;
    res.json({ success: true, data: responseData });
  }
}
