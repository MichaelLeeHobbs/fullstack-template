# Feature 00c: System Settings

> Status: 📋 Planned

## Overview

Runtime-configurable application settings stored in the database. This allows admins to change settings without redeploying, while keeping infrastructure secrets secure in environment variables.

## Dependencies

- [00_project-setup.md](000_setup.md) - Base project structure
- [01b_user-admin.md](005_user-admin.md) - Admin access required

---

## Design Philosophy

### What Goes Where?

| Type | Storage | Examples |
|------|---------|----------|
| **Infrastructure Secrets** | `.env` | DATABASE_URL, JWT_SECRET, S3 credentials, API keys |
| **Runtime Settings** | Database | Feature flags, email templates, AI model preferences |
| **Static Config** | Code | Validation rules, constants, timeouts |

### Why This Split?

1. **Security**: Secrets never touch the database (SQL injection safe)
2. **12-Factor App**: Environment-based config for infrastructure
3. **Flexibility**: Admins can change settings without deploys
4. **CI/CD**: Secrets injected during deployment, not stored in code

---

## Data Model

```typescript
// apps/api/src/db/schema/settings.ts
import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const settingTypeEnum = pgEnum('setting_type', [
  'string',
  'number', 
  'boolean',
  'json'
]);

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Key uses dot notation: 'feature.ai_enabled', 'email.from_name'
  key: varchar('key', { length: 255 }).notNull().unique(),
  
  // Value stored as string, parsed based on type
  value: text('value').notNull(),
  
  // Type for parsing
  type: settingTypeEnum('type').notNull().default('string'),
  
  // Human-readable description
  description: text('description'),
  
  // Category for grouping in admin UI
  category: varchar('category', { length: 100 }).default('general'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
```

---

## Default Settings

```typescript
// apps/api/src/db/seeds/settings.seed.ts
export const defaultSettings = [
  // Feature Flags
  {
    key: 'feature.ai_enabled',
    value: 'false',
    type: 'boolean',
    category: 'features',
    description: 'Enable AI-powered features',
  },
  {
    key: 'feature.registration_enabled',
    value: 'true',
    type: 'boolean',
    category: 'features',
    description: 'Allow new user registrations',
  },
  
  // Email Settings
  {
    key: 'email.from_name',
    value: 'App Name',
    type: 'string',
    category: 'email',
    description: 'Sender name for system emails',
  },
  
  // AI Settings
  {
    key: 'ai.default_model',
    value: 'claude-3-sonnet',
    type: 'string',
    category: 'ai',
    description: 'Default AI model for generation',
  },
  {
    key: 'ai.max_tokens',
    value: '4096',
    type: 'number',
    category: 'ai',
    description: 'Maximum tokens per AI request',
  },
  
  // Application Settings
  {
    key: 'app.maintenance_mode',
    value: 'false',
    type: 'boolean',
    category: 'general',
    description: 'Enable maintenance mode (blocks all non-admin access)',
  },
];
```

---

## SettingsService

```typescript
// apps/api/src/services/settings.service.ts
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db';
import { systemSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger';

// In-memory cache for performance
const cache = new Map<string, { value: unknown; expiresAt: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export class SettingsService {
  /**
   * Get a setting value by key
   */
  static async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const result = await tryCatch(async () => {
      const [setting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));

      if (!setting) {
        return defaultValue;
      }

      return this.parseValue(setting.value, setting.type);
    });

    if (!result.ok) {
      logger.error('Failed to get setting', { key, error: result.error.toString() });
      return defaultValue as T;
    }

    // Cache the result
    cache.set(key, { value: result.value, expiresAt: Date.now() + CACHE_TTL });

    return result.value as T;
  }

  /**
   * Set a setting value
   */
  static async set(key: string, value: unknown): Promise<Result<void>> {
    return tryCatch(async () => {
      const stringValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);

      await db.update(systemSettings)
        .set({ value: stringValue, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));

      // Invalidate cache
      cache.delete(key);
    });
  }

  /**
   * Get all settings (for admin UI)
   */
  static async getAll(): Promise<Result<SystemSetting[]>> {
    return tryCatch(async () => {
      return await db.select().from(systemSettings).orderBy(systemSettings.category);
    });
  }

  /**
   * Get settings by category
   */
  static async getByCategory(category: string): Promise<Result<SystemSetting[]>> {
    return tryCatch(async () => {
      return await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.category, category));
    });
  }

  /**
   * Clear the cache (useful after bulk updates)
   */
  static clearCache(): void {
    cache.clear();
  }

  private static parseValue(value: string, type: string): unknown {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return Number(value);
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }
}
```

---

## Usage Examples

```typescript
// Check if AI is enabled
const aiEnabled = await SettingsService.get<boolean>('feature.ai_enabled', false);
if (!aiEnabled) {
  return res.status(403).json({ error: 'AI features are disabled' });
}

// Get AI model preference
const model = await SettingsService.get<string>('ai.default_model', 'claude-3-sonnet');

// Check maintenance mode in middleware
export async function maintenanceCheck(req, res, next) {
  const maintenance = await SettingsService.get<boolean>('app.maintenance_mode', false);
  if (maintenance && !req.user?.isAdmin) {
    return res.status(503).json({ error: 'System under maintenance' });
  }
  next();
}
```

---

## API Endpoints (Admin Only)

### GET /api/v1/admin/settings

List all settings.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "feature.ai_enabled",
      "value": "true",
      "type": "boolean",
      "category": "features",
      "description": "Enable AI-powered features"
    }
  ]
}
```

### PATCH /api/v1/admin/settings/:key

Update a setting.

**Request:**
```json
{
  "value": "true"
}
```

---

## Acceptance Criteria

- [ ] Settings table created with proper schema
- [ ] Default settings seeded on first run
- [ ] SettingsService reads with caching
- [ ] SettingsService writes and invalidates cache
- [ ] Admin API for listing/updating settings
- [ ] Feature flags work correctly
- [ ] Maintenance mode blocks non-admin users

---

## Notes

- Settings are cached for 1 minute to reduce DB queries
- Secrets (API keys, passwords) stay in environment variables
- Consider Redis cache for multi-instance deployments (future)
- Admin UI for settings management in 01b_user-admin frontend

