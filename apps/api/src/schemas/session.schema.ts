// ===========================================
// Session Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const sessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;
