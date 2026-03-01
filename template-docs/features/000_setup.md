# Feature 00: Project Setup

> Status: ✅ Complete

## Overview

Initialize the monorepo structure with frontend (React/Vite) and backend (Express/Node) projects, configure tooling, and set up the database.

## Dependencies

None - this is the first feature.

---

## Tasks

### 1. Repository Structure

```
fullstack-template/
├── apps/
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── stores/
│   │   │   ├── styles/
│   │   │   ├── types/
│   │   │   ├── lib/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── api/                  # Express backend
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── providers/
│       │   ├── jobs/
│       │   ├── db/
│       │   │   ├── schema/
│       │   │   └── migrations/
│       │   ├── schemas/
│       │   ├── lib/
│       │   ├── config/
│       │   ├── app.ts
│       │   └── server.ts
│       ├── drizzle.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/               # Shared types/utilities
│       ├── src/
│       │   ├── types/
│       │   └── utils/
│       ├── package.json
│       └── tsconfig.json
│
├── template-docs/            # Documentation (existing)
├── .env.example
├── .gitignore
├── package.json              # Root workspace
├── pnpm-workspace.yaml
└── README.md
```

---

### 2. Root Package Setup

```json
{
  "name": "app",
  "private": true,
  "scripts": {
    "dev": "pnpm run --parallel dev",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "build": "pnpm run --parallel build",
    "lint": "pnpm run --parallel lint",
    "test": "pnpm run --parallel test",
    "db:generate": "pnpm --filter api db:generate",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:studio": "pnpm --filter api db:studio"
  },
  "devDependencies": {
    "typescript": "5.7.2"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

### 3. Backend Setup (apps/api)

```json
{
  "name": "api",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "express": "4.21.0",
    "drizzle-orm": "0.38.2",
    "pg": "8.13.1",
    "zod": "3.24.1",
    "jsonwebtoken": "9.0.2",
    "bcrypt": "5.1.1",
    "pino": "9.5.0",
    "pino-pretty": "13.0.0",
    "stderr-lib": "2.0.0",
    "cors": "2.8.5",
    "helmet": "8.0.0",
    "node-cron": "3.0.3"
  },
  "devDependencies": {
    "@types/express": "5.0.0",
    "@types/node": "22.10.2",
    "@types/jsonwebtoken": "9.0.7",
    "@types/bcrypt": "5.0.2",
    "@types/cors": "2.8.17",
    "@types/pg": "8.11.10",
    "drizzle-kit": "0.30.1",
    "tsx": "4.19.2",
    "typescript": "5.7.2"
  }
}
```

---

### 4. Frontend Setup (apps/web)

```json
{
  "name": "web",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-router-dom": "6.28.0",
    "@tanstack/react-query": "5.62.8",
    "zustand": "5.0.2",
    "@mui/material": "6.3.0",
    "@emotion/react": "11.14.0",
    "@emotion/styled": "11.14.0"
  },
  "devDependencies": {
    "@types/react": "18.3.14",
    "@types/react-dom": "18.3.2",
    "@vitejs/plugin-react": "4.3.4",
    "vite": "6.0.5",
    "typescript": "5.7.2"
  }
}
```

---

### 5. Shared Package (packages/shared)

```typescript
// packages/shared/src/types/api.ts
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
```

---

### 6. Drizzle Initial Setup

```typescript
// apps/api/src/db/schema/users.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

```typescript
// apps/api/src/db/schema/index.ts
export * from './users';
```

```typescript
// apps/api/src/lib/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from '../db/schema';

const pool = new Pool({ connectionString: config.DATABASE_URL });

export const db = drizzle(pool, { schema });
```

```typescript
// apps/api/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

### 7. Environment Configuration

```bash
# .env.example
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://user:password@localhost:5432/app?schema=public

JWT_SECRET=your-super-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d

LOG_LEVEL=debug
```

---

### 8. Logger Setup

```typescript
// apps/api/src/lib/logger.ts
import pino from 'pino';
import { config } from '../config';

const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export default logger;
```

---

### 9. Basic Express App

```typescript
// apps/api/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';
import logger from './lib/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
```

```typescript
// apps/api/src/server.ts
import app from './app';
import { config } from './config';
import logger from './lib/logger';

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server running');
});
```

```typescript
// apps/api/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { stderr } from 'stderr-lib';
import logger from '../lib/logger';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const err = stderr(error);
  
  logger.error({ 
    error: err.toString(), 
    path: req.path,
    method: req.method 
  }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
```

---

### 10. Basic React App with Dark Mode

```typescript
// apps/web/src/styles/theme.ts
import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6366f1' },
    secondary: { main: '#8b5cf6' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#818cf8' },
    secondary: { main: '#a78bfa' },
    background: { default: '#0f172a', paper: '#1e293b' },
  },
});
```

```typescript
// apps/web/src/stores/theme.store.ts
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
// apps/web/src/hooks/useTheme.ts
import { useMemo } from 'react';
import { useThemeStore } from '../stores/theme.store';
import { lightTheme, darkTheme } from '../styles/theme';

export function useTheme() {
  const { mode } = useThemeStore();

  const theme = useMemo(() => {
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? darkTheme : lightTheme;
    }
    return mode === 'dark' ? darkTheme : lightTheme;
  }, [mode]);

  return theme;
}
```

```typescript
// apps/web/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useTheme } from './hooks/useTheme';

const queryClient = new QueryClient();

function AppContent() {
  const theme = useTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Welcome to App Name</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
```

---

### 11. TypeScript Configuration

```json
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 12. ESLint & Prettier Config

```json
// .eslintrc.json (root)
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "no-console": "warn"
  }
}
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## Acceptance Criteria

- [x] `pnpm install` completes without errors
- [x] `pnpm dev:api` starts Express server on port 3000
- [x] `pnpm dev:web` starts Vite dev server on port 5173
- [x] `GET /health` returns `{ status: 'ok' }`
- [x] Drizzle can connect to PostgreSQL
- [x] `pnpm db:migrate` runs without errors
- [x] TypeScript compilation succeeds (`pnpm build`)
- [x] ESLint passes (`pnpm lint`)
- [x] Dark mode toggle works in frontend
- [x] Pino logs structured JSON in production mode
- [x] Pino logs pretty-printed in development mode

---

## Notes

- Using pnpm workspaces for monorepo management
- tsx for development (fast TypeScript execution)
- Drizzle for SQL-like type-safe queries
- stderr-lib for Result-based error handling
- Dark mode supported from day 1
- Exact version pinning in package.json

