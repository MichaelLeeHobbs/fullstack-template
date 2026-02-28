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
  DATABASE_SSL: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Proxy — accepts 'true', 'false', 'loopback', number, or specific IPs
  TRUST_PROXY: z.string().default('false')
    .transform((v): boolean | number | string => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      const num = Number(v);
      if (!isNaN(num)) return num;
      return v;
    }),

  // Encryption (for secrets at rest; falls back to JWT_SECRET if not set)
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // S3 / MinIO
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),

  // Email Provider Configuration
  EMAIL_PROVIDER: z.enum(['mock', 'smtp', 'ses']).default('mock'),
  EMAIL_FROM: z.string().email().optional(),

  // SMTP Configuration (for EMAIL_PROVIDER=smtp)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // AWS SES Configuration (for EMAIL_PROVIDER=ses)
  AWS_SES_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  // PKI / Certificate Login
  TRUSTED_PROXY_IP: z.string().optional(),
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
