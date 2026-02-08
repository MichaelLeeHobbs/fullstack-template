// ===========================================
// Settings Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const updateSettingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
