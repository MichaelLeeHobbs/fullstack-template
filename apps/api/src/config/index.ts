// ===========================================
// Application Configuration
// ===========================================
// Validates environment variables at startup using Zod.
// If validation fails, the app exits immediately.
//
// NOTE: Feature flags are stored in the database (system_settings table)
// and can be managed via Admin UI. See docs/features/003_system-settings.md

import { config as loadEnv } from 'dotenv';
import { z } from 'zod/v4';

// Load .env from project root (works whether running from apps/api or root)
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env' }); // Fallback for running from apps/api directly

const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().url(),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // S3 / MinIO
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),

  // AWS SES (optional - for production email)
  AWS_SES_REGION: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // AI Provider API Keys (optional - secrets stay in env)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
});

const result = configSchema.safeParse(process.env);

if (!result.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(z.prettifyError(result.error));
  process.exit(1);
}

export const config = result.data;

export type Config = typeof config;
