# Core Patterns

> Last Updated: 2024-12-28

## Overview

This document defines the architectural patterns used throughout this project. Follow these patterns for consistency and maintainability.

---

## Backend Architecture

### Request Flow (4-Layer Pattern)

```
HTTP Request
    │
    ▼
┌─────────────────┐
│     Router      │  Route definitions, middleware attachment
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Middleware    │  Auth, validation, rate limiting
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Controller    │  Request parsing, response formatting
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Service      │  Business logic, orchestration
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Model       │  Data access (Drizzle)
└─────────────────┘
```

---

## Layer Responsibilities

### Router (`/src/routes/*.ts`)

- Define HTTP routes (GET, POST, PUT, DELETE)
- Attach middleware (auth, validation)
- Map routes to controller methods
- **No business logic**

```typescript
// src/routes/world.routes.ts
import { Router } from 'express';
import { WorldController } from '../controllers/world.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createWorldSchema } from '../schemas/world.schema';

const router = Router();

router.use(authenticate);

router.get('/', WorldController.list);
router.post('/', validate(createWorldSchema), WorldController.create);

export default router;
```

---

### Controller (`/src/controllers/*.ts`)

- Parse request data
- Call service methods (which return `Result<T>`)
- Format HTTP responses
- Handle HTTP concerns (status codes)
- **No direct database access**

```typescript
// src/controllers/world.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod/v4';
import { WorldService } from '../services/world.service';
import { createWorldSchema } from '../schemas/world.schema';
import logger from '../lib/logger';

export class WorldController {
  static async list(req: Request, res: Response): Promise<void> {
    const result = await WorldService.listByUser(req.user!.id);

    if (!result.ok) {
      logger.error('Failed to list worlds', { error: result.error.toString() });
      return void res.status(500).json({ success: false, error: 'Internal error' });
    }

    res.json({ success: true, data: result.value });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const parseResult = createWorldSchema.safeParse(req.body);
    if (!parseResult.success) {
      return void res.status(400).json({
        success: false,
        error: z.prettifyError(parseResult.error),
      });
    }

    const result = await WorldService.create(req.user!.id, parseResult.data);

    if (!result.ok) {
      logger.error('Failed to create world', { error: result.error.toString() });
      return void res.status(500).json({ success: false, error: 'Internal error' });
    }

    res.status(201).json({ success: true, data: result.value });
  }
}
```

---

### Service (`/src/services/*.ts`)

- All business logic
- Return `Result<T>` using `tryCatch()`
- Orchestrate multiple operations
- Enforce business rules
- Handle transactions
- **No HTTP concerns (no req/res)**

```typescript
// src/services/world.service.ts
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db';
import { worlds, epochs } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { World, Epoch } from '../db/schema';

interface WorldWithEpochs extends World {
  epochs: Epoch[];
}

export class WorldService {
  static async listByUser(userId: string): Promise<Result<World[]>> {
    return tryCatch(async () => {
      return db.select().from(worlds).where(eq(worlds.createdByUserId, userId));
    });
  }

  static async create(userId: string, data: { name: string }): Promise<Result<WorldWithEpochs>> {
    return tryCatch(async () => {
      return db.transaction(async (tx) => {
        const [world] = await tx.insert(worlds).values({
          name: data.name,
          createdByUserId: userId,
        }).returning();

        const [epochNul] = await tx.insert(epochs).values({
          worldId: world.id,
          name: 'Epoch NUL',
          order: 0,
        }).returning();

        return { ...world, epochs: [epochNul] };
      });
    });
  }

  static async getById(userId: string, worldId: string): Promise<Result<World>> {
    return tryCatch(async () => {
      const [world] = await db.select().from(worlds)
        .where(eq(worlds.id, worldId));

      if (!world || world.createdByUserId !== userId) {
        throw new Error('World not found');
      }

      return world;
    });
  }
}
```

---

### Model (`/src/db/schema.ts`)

- Drizzle schema definitions
- Type exports
- **No business logic**

```typescript
// src/db/schema.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const worlds = pgTable('worlds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdByUserId: uuid('created_by_user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type World = typeof worlds.$inferSelect;
export type NewWorld = typeof worlds.$inferInsert;
```

---

## Non-Request Patterns

### Providers (`/src/providers/*.ts`)

External service integrations (APIs, storage, email).

```typescript
// src/providers/anthropic.provider.ts
import Anthropic from '@anthropic-ai/sdk';
import { tryCatch, type Result } from 'stderr-lib';
import { config } from '../config';
import logger from '../lib/logger';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export interface GenerateOptions {
  prompt: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function generateText(options: GenerateOptions): Promise<Result<string>> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(), 
    options.timeoutMs ?? 30000
  );

  const result = await tryCatch(async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens ?? 1024,
      messages: [{ role: 'user', content: options.prompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  });

  clearTimeout(timeout);
  
  if (!result.ok) {
    logger.error('Anthropic API failed', { error: result.error.toString() });
  }
  
  return result;
}
```

```typescript
// src/providers/s3.provider.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { tryCatch, type Result } from 'stderr-lib';
import { config } from '../config';

const s3 = new S3Client({ region: config.S3_REGION });

export async function uploadFile(
  key: string, 
  body: Buffer, 
  contentType: string
): Promise<Result<string>> {
  return tryCatch(async () => {
    await s3.send(new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return `https://${config.S3_BUCKET}.s3.amazonaws.com/${key}`;
  });
}
```

---

### Jobs (`/src/jobs/*.ts`)

Background tasks, scheduled work, async processing.

```typescript
// src/jobs/cleanup.job.ts
import { db } from '../lib/db';
import { versions } from '../db/schema';
import { lt, eq, and } from 'drizzle-orm';
import logger from '../lib/logger';

/**
 * Cleanup old auto-save versions (keep last 50 per entity).
 * Run via cron or task scheduler.
 */
export async function cleanupOldVersions(): Promise<void> {
  logger.info('Starting version cleanup job');

  const result = await tryCatch(async () => {
    // Delete auto-saves older than 50 per entity
    const deleted = await db.delete(versions)
      .where(
        and(
          eq(versions.versionType, 'auto'),
          lt(versions.createdAt, getCleanupCutoff())
        )
      )
      .returning();
    
    return deleted.length;
  });

  if (!result.ok) {
    logger.error('Cleanup job failed', { error: result.error.toString() });
    return;
  }

  logger.info('Cleanup job completed', { deletedCount: result.value });
}
```

```typescript
// src/jobs/index.ts
import cron from 'node-cron';
import { cleanupOldVersions } from './cleanup.job';
import logger from '../lib/logger';

export function initializeJobs(): void {
  // Run cleanup daily at 3am
  cron.schedule('0 3 * * *', () => {
    void cleanupOldVersions();
  });

  logger.info('Background jobs initialized');
}
```

---

### Libs (`/src/lib/*.ts`)

Shared utilities, configured clients, helpers.

```typescript
// src/lib/logger.ts
import pino from 'pino';
import { config } from '../config';

const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined,
});

export default logger;
```

```typescript
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from '../db/schema';

const pool = new Pool({ connectionString: config.DATABASE_URL });

export const db = drizzle(pool, { schema });
```

```typescript
// src/lib/jwt.ts
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
  userId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}
```

---

## Backend File Organization

```
apps/api/src/
├── controllers/        # HTTP request handlers
│   └── world.controller.ts
│
├── services/           # Business logic
│   └── world.service.ts
│
├── routes/             # Route definitions
│   ├── index.ts
│   └── world.routes.ts
│
├── middleware/         # Express middleware
│   ├── auth.middleware.ts
│   ├── validate.middleware.ts
│   └── error.middleware.ts
│
├── providers/          # External integrations
│   ├── anthropic.provider.ts
│   ├── s3.provider.ts
│   └── email.provider.ts
│
├── jobs/               # Background tasks
│   ├── index.ts
│   ├── cleanup.job.ts
│   └── export.job.ts
│
├── db/                 # Drizzle schema
│   ├── schema.ts
│   └── migrations/
│
├── schemas/            # Zod validation
│   └── world.schema.ts
│
├── lib/                # Shared utilities
│   ├── db.ts
│   ├── logger.ts
│   └── jwt.ts
│
├── config/
│   └── index.ts
│
├── app.ts
└── server.ts
```

---

## Frontend Architecture

### Component Flow

```
┌─────────────────┐
│    Component    │  UI rendering, user events
└────────┬────────┘
         │ uses
         ▼
┌─────────────────┐
│      Hook       │  State management, side effects
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│   API Client    │  HTTP requests, response handling
└────────┬────────┘
         │ fetches
         ▼
┌─────────────────┐
│   Backend API   │
└─────────────────┘
```

---

### Component (`/src/components/*.tsx`)

- UI rendering
- Event handlers
- Uses hooks for data/state
- **No direct API calls**

```typescript
// src/components/WorldList.tsx
import { useWorlds } from '../hooks/useWorlds';
import { WorldCard } from './WorldCard';
import { Spinner } from './ui/Spinner';

export function WorldList() {
  const { data: worlds, isLoading, error } = useWorlds();

  if (isLoading) return <Spinner />;
  if (error) return <div>Error loading worlds</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {worlds?.map((world) => (
        <WorldCard key={world.id} world={world} />
      ))}
    </div>
  );
}
```

---

### Hook (`/src/hooks/*.ts`)

- Data fetching with TanStack Query
- Local state management
- Side effects
- **Reusable logic**

```typescript
// src/hooks/useWorlds.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { worldsApi } from '../api/worlds.api';
import type { World, CreateWorldInput } from '../types';

export function useWorlds() {
  return useQuery({
    queryKey: ['worlds'],
    queryFn: worldsApi.list,
  });
}

export function useCreateWorld() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorldInput) => worldsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worlds'] });
    },
  });
}

export function useWorld(id: string) {
  return useQuery({
    queryKey: ['worlds', id],
    queryFn: () => worldsApi.getById(id),
    enabled: !!id,
  });
}
```

---

### API Client (`/src/api/*.ts`)

- HTTP requests
- Request/response transformation
- Error handling
- **No UI concerns**

```typescript
// src/api/client.ts
import { useAuthStore } from '../stores/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export async function apiFetch<T>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.data as T;
}
```

```typescript
// src/api/worlds.api.ts
import { apiFetch } from './client';
import type { World, CreateWorldInput } from '../types';

export const worldsApi = {
  list: () => apiFetch<World[]>('/worlds'),
  
  getById: (id: string) => apiFetch<World>(`/worlds/${id}`),
  
  create: (data: CreateWorldInput) => 
    apiFetch<World>('/worlds', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: Partial<CreateWorldInput>) =>
    apiFetch<World>(`/worlds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiFetch<void>(`/worlds/${id}`, { method: 'DELETE' }),
};
```

---

### Store (`/src/stores/*.ts`)

Global state with Zustand (auth, UI preferences).

```typescript
// src/stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: { id: string; email: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthState['user'], accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => 
        set({ user, accessToken, refreshToken }),
      clearAuth: () => 
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

---

### Frontend File Organization

```
apps/web/src/
├── components/         # UI components
│   ├── ui/            # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Spinner.tsx
│   ├── layout/        # Layout components
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── features/      # Feature-specific
│       ├── WorldCard.tsx
│       └── EntityList.tsx
│
├── pages/              # Route pages
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   └── WorldPage.tsx
│
├── hooks/              # Custom hooks
│   ├── useWorlds.ts
│   └── useAuth.ts
│
├── api/                # API client
│   ├── client.ts
│   └── worlds.api.ts
│
├── stores/             # Zustand stores
│   ├── auth.store.ts
│   └── theme.store.ts
│
├── types/              # TypeScript types
│   └── index.ts
│
├── lib/                # Utilities
│   └── utils.ts
│
├── styles/             # Global styles
│   └── theme.ts
│
├── App.tsx
└── main.tsx
```

---

## Dark Mode Support

Use CSS variables with MUI theme for easy dark mode.

```typescript
// src/styles/theme.ts
import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
});
```

```typescript
// src/stores/theme.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'theme-storage' }
  )
);
```

```typescript
// src/App.tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useThemeStore } from './stores/theme.store';
import { lightTheme, darkTheme } from './styles/theme';

function App() {
  const { mode } = useThemeStore();
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      {/* Routes */}
    </ThemeProvider>
  );
}
```

---

## Naming Conventions

| Type             | Convention            | Example               |
|------------------|-----------------------|-----------------------|
| Files (backend)  | kebab-case            | `world.controller.ts` |
| Files (frontend) | PascalCase components | `WorldCard.tsx`       |
| Classes          | PascalCase            | `WorldController`     |
| Functions        | camelCase             | `getWorldById`        |
| Constants        | UPPER_SNAKE           | `MAX_RETRY_COUNT`     |
| Database tables  | snake_case            | `entity_epoch_states` |
| API routes       | kebab-case            | `/api/v1/worlds/:id`  |
| Types/Interfaces | PascalCase            | `CreateWorldInput`    |

---

## API Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}

// Error
{
  "success": false,
  "error": "Error description"
}
```

