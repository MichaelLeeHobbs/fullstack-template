// ===========================================
// SSO Validation Schemas (Backend)
// ===========================================
// Re-exports from shared package + backend-only schemas.

import { z } from 'zod/v4';

export {
  createSsoProviderSchema,
  updateSsoProviderSchema,
  ssoSlugParamSchema,
  ssoExchangeSchema,
} from '@fullstack-template/shared';

export type {
  CreateSsoProviderInput,
  UpdateSsoProviderInput,
  SsoSlugParam,
  SsoExchangeInput,
} from '@fullstack-template/shared';

// Backend-only schema
export const ssoToggleSchema = z.object({
  isEnabled: z.boolean(),
});

export type SsoToggleInput = z.infer<typeof ssoToggleSchema>;
