# Feature 01b: User Administration

> Status: 📋 Planned

## Overview

Implement user administration features including role-based access control, account management, password recovery, and email verification.

## Dependencies

- [00_project-setup.md](000_setup.md) - Base project structure
- [01a_user-auth.md](004_user-auth.md) - Core authentication

---

## Data Model Updates

```typescript
// src/db/schema/users.ts - Updated
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  
  // Role & Status
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

// Email verification tokens
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Password reset tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit log for security events
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(), // 'login', 'logout', 'password_change', etc.
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  details: varchar('details', { length: 1000 }),
  success: boolean('success').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## API Endpoints

### Account Management (Self-Service)

#### POST /api/v1/account/change-password

Change current user's password.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```

**Errors:**
- 400: Validation error / Password doesn't meet requirements
- 401: Current password incorrect

---

#### POST /api/v1/auth/forgot-password

Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "If an account exists, a reset email has been sent" }
}
```

*Note: Always returns success to prevent email enumeration*

---

#### POST /api/v1/auth/reset-password

Reset password using token from email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Password reset successfully" }
}
```

**Errors:**
- 400: Invalid or expired token

---

#### POST /api/v1/auth/verify-email

Verify email address using token.

**Request:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Email verified successfully" }
}
```

---

#### POST /api/v1/auth/resend-verification

Resend verification email.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Verification email sent" }
}
```

---

### Admin User Management

#### GET /api/v1/admin/users

List all users (admin only).

**Headers:** `Authorization: Bearer <accessToken>`

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (email search)
- `isActive` (true/false)
- `isAdmin` (true/false)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "isAdmin": false,
        "isActive": true,
        "emailVerified": true,
        "createdAt": "2024-12-28T00:00:00Z",
        "lastLoginAt": "2024-12-29T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

#### GET /api/v1/admin/users/:id

Get user details (admin only).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "isAdmin": false,
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2024-12-28T00:00:00Z",
    "updatedAt": "2024-12-29T00:00:00Z",
    "lastLoginAt": "2024-12-29T12:00:00Z"
  }
}
```

---

#### PATCH /api/v1/admin/users/:id

Update user (admin only).

**Request:**
```json
{
  "isActive": false,
  "isAdmin": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "isAdmin": true,
    "isActive": false
  }
}
```

---

#### DELETE /api/v1/admin/users/:id

Delete user (admin only).

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "User deleted successfully" }
}
```

*Note: Admin cannot delete themselves*

---

### Audit Logs (Admin)

#### GET /api/v1/admin/audit-logs

View security audit logs.

**Query Params:**
- `page`, `limit`
- `userId` (filter by user)
- `action` (login, logout, password_change, etc.)
- `success` (true/false)
- `startDate`, `endDate`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "uuid",
        "userEmail": "user@example.com",
        "action": "login",
        "ipAddress": "192.168.1.1",
        "success": true,
        "createdAt": "2024-12-29T12:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

## Middleware

### Admin Authorization

```typescript
// src/middleware/admin.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.id) {
    return void res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const [user] = await db.select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, req.user.id));

  if (!user?.isAdmin) {
    return void res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }

  next();
}
```

### Rate Limiting

```typescript
// src/middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour
  message: { success: false, error: 'Too many reset requests' },
});
```

---

## Email Service (Placeholder)

```typescript
// src/services/email.service.ts
import logger from '../lib/logger';

// TODO: Replace with actual email provider (AWS SES, SendGrid, etc.)
export class EmailService {
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    // For now, just log - replace with real email sending
    logger.info('MOCK: Sending verification email', { email, verifyUrl });
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    logger.info('MOCK: Sending password reset email', { email, resetUrl });
  }
}
```

---

## Acceptance Criteria

### Account Management
- [ ] Users can change their password
- [ ] Forgot password sends reset email
- [ ] Password reset token expires after 1 hour
- [ ] Password reset invalidates existing sessions
- [ ] Email verification sends verification email
- [ ] Verification token expires after 24 hours
- [ ] Users can resend verification email

### Admin Features
- [ ] Only admins can access /admin/* endpoints
- [ ] Admins can list all users with pagination
- [ ] Admins can search users by email
- [ ] Admins can enable/disable user accounts
- [ ] Admins can promote/demote admin status
- [ ] Admins can delete users (not themselves)
- [ ] Audit logs track security events

### Rate Limiting
- [ ] Login limited to 5 attempts per 15 min
- [ ] Password reset limited to 3 per hour
- [ ] Rate limit returns 429 with retry-after

### Security
- [ ] Inactive users cannot log in
- [ ] Login updates lastLoginAt timestamp
- [ ] All auth actions create audit log entries
- [ ] Email enumeration prevented on forgot password

---

## Notes

- First registered user should be made admin automatically (seed)
- Email service is mocked - implement with AWS SES in production
- Consider adding social login in future (see FUTURE_FEATURES.md)

