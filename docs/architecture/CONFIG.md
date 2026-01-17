# Configuration Management

> Last Updated: 2026-01-03

## Overview

Configuration is split into two categories:
1. **Environment Variables** - Infrastructure secrets loaded at startup
2. **System Settings** - Runtime settings stored in database

This split follows security best practices and 12-factor app principles.

---

## Configuration Philosophy

| Type                       | Storage  | When to Use                           |
|----------------------------|----------|---------------------------------------|
| **Infrastructure Secrets** | `.env`   | DB credentials, API keys, JWT secrets |
| **Runtime Settings**       | Database | Feature flags, UI config, thresholds  |
| **Static Config**          | Code     | Validation rules, constants           |

### Why This Split?

1. **Security**: Secrets never touch the database (SQL injection safe)
2. **12-Factor App**: Environment-based config for infrastructure
3. **CI/CD**: Secrets injected during deployment
4. **Flexibility**: Admins can change settings without redeploys

---

## Environment Files

```
.env                 # Local development (git-ignored)
.env.example         # Template with placeholder values (committed)
.env.test            # Test environment overrides (git-ignored)
```

---

## Environment Variables Reference

### Application

| Variable       | Required | Default                 | Description                    |
|----------------|----------|-------------------------|--------------------------------|
| `NODE_ENV`     | No       | `development`           | Environment mode               |
| `PORT`         | No       | `3000`                  | HTTP server port               |
| `FRONTEND_URL` | No       | `http://localhost:5173` | Frontend URL (for email links) |

### Database

| Variable       | Required | Default | Description                  |
|----------------|----------|---------|------------------------------|
| `DATABASE_URL` | **Yes**  | -       | PostgreSQL connection string |

### Authentication

| Variable         | Required | Default | Description                            |
|------------------|----------|---------|----------------------------------------|
| `JWT_SECRET`     | **Yes**  | -       | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No       | `7d`    | Refresh token expiration               |

### Logging

| Variable    | Required | Default | Description    |
|-------------|----------|---------|----------------|
| `LOG_LEVEL` | No       | `info`  | Pino log level |

### Storage (S3/MinIO)

| Variable        | Required | Default     | Description           |
|-----------------|----------|-------------|-----------------------|
| `S3_ENDPOINT`   | **Yes**  | -           | S3/MinIO endpoint URL |
| `S3_ACCESS_KEY` | **Yes**  | -           | Access key ID         |
| `S3_SECRET_KEY` | **Yes**  | -           | Secret access key     |
| `S3_BUCKET`     | **Yes**  | -           | Bucket name           |
| `S3_REGION`     | No       | `us-east-1` | AWS region            |

### AI Providers

| Variable            | Required | Default | Description    |
|---------------------|----------|---------|----------------|
| `ANTHROPIC_API_KEY` | No       | -       | Claude API key |
| `GOOGLE_AI_API_KEY` | No       | -       | Gemini API key |
| `OPENAI_API_KEY`    | No       | -       | OpenAI API key |

### Production Only

| Variable         | Required | Default | Description               |
|------------------|----------|---------|---------------------------|
| `AWS_SES_REGION` | No       | -       | AWS SES region for emails |
| `EMAIL_FROM`     | No       | -       | Sender email address      |

---

## System Settings (Database)

Runtime settings are stored in the `system_settings` table and managed via Admin UI.

### Default Settings

| Key                                   | Type    | Default                    | Description                |
|---------------------------------------|---------|----------------------------|----------------------------|
| `feature.ai_enabled`                  | boolean | `false`                    | Enable AI features         |
| `feature.registration_enabled`        | boolean | `true`                     | Allow new registrations    |
| `feature.email_verification_required` | boolean | `false`                    | Require email verification |
| `email.from_name`                     | string  | `App Name`                 | Sender name for emails     |
| `ai.default_model`                    | string  | `claude-3-sonnet-20240229` | Default AI model           |
| `ai.max_tokens`                       | number  | `4096`                     | Max tokens per request     |
| `ai.temperature`                      | number  | `0.7`                      | AI creativity (0-1)        |
| `app.maintenance_mode`                | boolean | `false`                    | Block non-admin access     |
| `app.max_worlds_per_user`             | number  | `10`                       | World limit per user       |

### Accessing System Settings

```typescript
import { SettingsService } from '../services/settings.service';

// Get with default fallback
const aiEnabled = await SettingsService.get<boolean>('feature.ai_enabled', false);
const maxTokens = await SettingsService.get<number>('ai.max_tokens', 4096);

// Update setting
await SettingsService.set('feature.ai_enabled', true);
```

### Caching

Settings are cached in-memory for 1 minute to reduce database queries. Cache is invalidated on updates.

---

## Configuration Loader

```typescript
// apps/api/src/config/index.ts
import { z } from 'zod/v4';

const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  
  // Database
  DATABASE_URL: z.string().min(1),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // S3/MinIO
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),
  
  // AI Providers (optional)
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Production Email
  AWS_SES_REGION: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
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
```

---

## Example .env File

```bash
# ===================
# Application
# ===================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# ===================
# Database
# ===================
DATABASE_URL=postgresql://app:app_dev@localhost:5432/app

# ===================
# Authentication
# ===================
JWT_SECRET=your-super-secret-key-change-in-production-minimum-32-chars
JWT_EXPIRES_IN=7d

# ===================
# Logging
# ===================
LOG_LEVEL=debug

# ===================
# S3 / MinIO
# ===================
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=app-assets
S3_REGION=us-east-1

# ===================
# AI Providers (Optional)
# ===================
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
```

---

## Secrets Management

### Development
- Use `.env` file (git-ignored)
- Use MinIO for local S3-compatible storage
- Mock emails logged to console

### Production (AWS)
- Use AWS Secrets Manager or SSM Parameter Store
- Use AWS SES for email
- Use AWS S3 for storage
- Inject secrets via CI/CD pipeline
- Rotate secrets periodically

---

## Validation on Startup

The config loader validates all required variables at application startup:

1. Parses environment variables with Zod
2. Logs missing/invalid variables with `z.prettifyError()`
3. Exits with code 1 on validation failure
4. Prevents app from starting with invalid config

This "fail fast" approach catches configuration errors immediately.

