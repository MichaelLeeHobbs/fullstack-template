# Feature 01a: User Authentication

> Status: ✅ Complete (Tests In Progress)

## Overview

Implement user registration, login, logout, and JWT-based authentication.

## Dependencies

- [00_project-setup.md](000_setup.md) - Base project structure

---

## Data Model

```typescript
// src/db/schema/users.ts
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

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: varchar('refresh_token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
```

---

## API Endpoints

### POST /api/v1/auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2024-12-28T00:00:00Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Errors:**
- 400: Validation error (invalid email, weak password)
- 409: Email already exists

---

### POST /api/v1/auth/login

Authenticate user and get tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Errors:**
- 401: Invalid email or password

---

### POST /api/v1/auth/refresh

Get new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### POST /api/v1/auth/logout

Invalidate refresh token.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### GET /api/v1/auth/me

Get current user profile.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-12-28T00:00:00Z"
  }
}
```

---

## Validation Schemas

```typescript
// src/schemas/auth.schema.ts
import { z } from 'zod/v4';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

---

## Controller Implementation

```typescript
// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod/v4';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema';
import logger from '../lib/logger';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return void res.status(400).json({
        success: false,
        error: z.prettifyError(parseResult.error),
      });
    }

    const result = await AuthService.register(parseResult.data.email, parseResult.data.password);

    if (!result.ok) {
      logger.error('Registration failed', { error: result.error.toString() });
      
      if (result.error.message?.includes('already exists')) {
        return void res.status(409).json({ success: false, error: 'Email already registered' });
      }
      
      return void res.status(500).json({ success: false, error: 'Registration failed' });
    }

    res.status(201).json({ success: true, data: result.value });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return void res.status(400).json({
        success: false,
        error: z.prettifyError(parseResult.error),
      });
    }

    const result = await AuthService.login(parseResult.data.email, parseResult.data.password);

    if (!result.ok) {
      logger.warn('Login failed', { email: parseResult.data.email });
      return void res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    res.json({ success: true, data: result.value });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      return void res.status(400).json({
        success: false,
        error: z.prettifyError(parseResult.error),
      });
    }

    const result = await AuthService.refresh(parseResult.data.refreshToken);

    if (!result.ok) {
      return void res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    res.json({ success: true, data: result.value });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      return void res.status(400).json({
        success: false,
        error: z.prettifyError(parseResult.error),
      });
    }

    const result = await AuthService.logout(parseResult.data.refreshToken);
    
    if (!result.ok) {
      logger.error('Logout failed', { error: result.error.toString() });
      return void res.status(500).json({ success: false, error: 'Logout failed' });
    }

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const result = await AuthService.getUser(req.user!.id);

    if (!result.ok) {
      return void res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result.value });
  }
}
```

---

## Service Implementation

```typescript
// src/services/auth.service.ts
import bcrypt from 'bcrypt';
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db';
import { users, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';

const SALT_ROUNDS = 12;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RegisterResult {
  user: { id: string; email: string; createdAt: Date };
  accessToken: string;
  refreshToken: string;
}

interface LoginResult {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async register(email: string, password: string): Promise<Result<RegisterResult>> {
    return tryCatch(async () => {
      // Check if email exists
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const [user] = await db.insert(users)
        .values({ email, passwordHash })
        .returning({ id: users.id, email: users.email, createdAt: users.createdAt });

      // Generate tokens
      const tokens = await this.createTokens(user.id);

      return { user, ...tokens };
    });
  }

  static async login(email: string, password: string): Promise<Result<LoginResult>> {
    return tryCatch(async () => {
      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.createTokens(user.id);

      return {
        user: { id: user.id, email: user.email },
        ...tokens,
      };
    });
  }

  static async refresh(refreshToken: string): Promise<Result<AuthTokens>> {
    return tryCatch(async () => {
      // Verify token
      const payload = verifyRefreshToken(refreshToken);
      
      // Find session
      const [session] = await db.select()
        .from(sessions)
        .where(eq(sessions.refreshToken, refreshToken));

      if (!session || session.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
      }

      // Delete old session (rotate tokens)
      await db.delete(sessions).where(eq(sessions.id, session.id));

      // Create new tokens
      return this.createTokens(payload.userId);
    });
  }

  static async logout(refreshToken: string): Promise<Result<void>> {
    return tryCatch(async () => {
      await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
    });
  }

  static async getUser(userId: string): Promise<Result<{ id: string; email: string; createdAt: Date }>> {
    return tryCatch(async () => {
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    });
  }

  private static async createTokens(userId: string): Promise<AuthTokens> {
    const accessToken = signAccessToken({ userId });
    const refreshToken = signRefreshToken({ userId });

    // Store refresh token
    await db.insert(sessions).values({
      userId,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { accessToken, refreshToken };
  }
}
```

---

## Auth Middleware

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import logger from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return void res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId };
    next();
  } catch {
    logger.warn('Invalid token attempt', { path: req.path });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
```

---

## Routes

```typescript
// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
```

---

## JWT Implementation

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

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}
```

---

## Acceptance Criteria

- [x] Users can register with email/password
- [x] Password is hashed before storage
- [x] Users can log in with correct credentials
- [x] Invalid login returns 401
- [x] Access token expires after 15 minutes
- [x] Refresh token rotates on use
- [x] Protected routes redirect to login
- [x] Logout invalidates refresh token
- [x] Duplicate email registration returns 409
- [x] Password validation enforces rules
- [x] Zod prettifyError used for validation messages

---

## Security Considerations

- Passwords hashed with bcrypt (12 rounds)
- Access tokens short-lived (15 min)
- Refresh tokens stored in DB for revocation
- Refresh tokens rotated on each use
- No password in response payloads

