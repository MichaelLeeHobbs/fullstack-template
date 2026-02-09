// ===========================================
// Auth Service
// ===========================================
// Handles user registration, login, token refresh, and logout.
// All methods return Result<T> using tryCatch from stderr-lib.

import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import { users, sessions, emailVerificationTokens, type UserPreferences, ACCOUNT_TYPES } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, verifyRefreshToken, signMfaTempToken, verifyMfaTempToken } from '../lib/jwt.js';
import { PermissionService } from './permission.service.js';
import { enqueue } from '../jobs/index.js';
import { AccountLockoutService } from './account-lockout.service.js';
import { MfaService } from './mfa.service.js';
import { SettingsService } from './settings.service.js';
import { NotificationService } from './notification.service.js';
import type { MfaMethod } from '../db/schema/index.js';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 7;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  isAdmin: boolean;
  preferences: UserPreferences;
  permissions: string[];
  createdAt: Date;
}

export interface RegisterResult {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface LoginSuccessResult {
  mfaRequired?: false;
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface MfaRequiredResult {
  mfaRequired: true;
  mfaMethods: MfaMethod[];
  tempToken: string;
}

export type LoginResult = LoginSuccessResult | MfaRequiredResult;

export class AuthService {
  static async register(email: string, password: string, metadata?: SessionMetadata): Promise<Result<RegisterResult>> {
    return tryCatch(async () => {
      // Check + hash outside transaction (read-only + CPU-bound)
      const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existing) {
        throw new ServiceError('ALREADY_EXISTS', 'Email already exists');
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Transaction: create user + verification token atomically
      const { user, verificationToken } = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email: email.toLowerCase(),
            passwordHash,
          })
          .returning({
            id: users.id,
            email: users.email,
            isAdmin: users.isAdmin,
            preferences: users.preferences,
            createdAt: users.createdAt,
          });

        if (!user) {
          throw new Error('Failed to create user');
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await tx.insert(emailVerificationTokens).values({ userId: user.id, token, expiresAt });

        return { user, verificationToken: token };
      });

      // External calls after transaction commits
      await enqueue('email.verification', { email: user.email, token: verificationToken });
      const tokens = await this.createTokens(user.id, metadata);
      const permissions = await PermissionService.getUserPermissions(user.id);

      return {
        user: {
          ...user,
          permissions: Array.from(permissions),
        },
        ...tokens,
      };
    });
  }

  static async login(email: string, password: string, metadata?: SessionMetadata): Promise<Result<LoginResult>> {
    return tryCatch(async () => {
      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Guard: service accounts cannot log in interactively
      if (user.accountType === ACCOUNT_TYPES.SERVICE || !user.passwordHash) {
        throw new Error('Service accounts cannot log in');
      }

      // Check account lockout
      const lockResult = await AccountLockoutService.isLocked(user.id);
      if (lockResult.ok && lockResult.value.locked) {
        throw new ServiceError('ACCOUNT_LOCKED', 'Account is locked', { minutesRemaining: lockResult.value.minutesRemaining });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        const attemptResult = await AccountLockoutService.recordFailedAttempt(user.id);
        if (attemptResult.ok && attemptResult.value.locked) {
          throw new ServiceError('ACCOUNT_LOCKED', 'Too many failed attempts. Account has been temporarily locked.', { lockedNow: true });
        }
        const remaining = attemptResult.ok ? attemptResult.value.attemptsRemaining : undefined;
        throw new ServiceError('INVALID_CREDENTIALS', 'Invalid credentials', { attemptsRemaining: remaining });
      }

      // Check if email is verified (only when setting is enabled)
      const emailVerificationRequired = await SettingsService.get<boolean>('feature.email_verification_required', false);
      if (emailVerificationRequired && !user.emailVerified) {
        throw new ServiceError('EMAIL_NOT_VERIFIED', 'Email not verified');
      }

      // Check if account is active
      if (!user.isActive) {
        throw new ServiceError('ACCOUNT_DEACTIVATED', 'Account is deactivated');
      }

      // Reset lockout on successful login
      await AccountLockoutService.resetAttempts(user.id);

      // Check MFA
      const mfaResult = await MfaService.getEnabledMethods(user.id);
      if (mfaResult.ok && mfaResult.value.length > 0) {
        const tempToken = signMfaTempToken({ userId: user.id, purpose: 'mfa' });
        return {
          mfaRequired: true as const,
          mfaMethods: mfaResult.value,
          tempToken,
        };
      }

      // Update lastLoginAt
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Generate tokens
      const tokens = await this.createTokens(user.id, metadata);

      // Get user permissions
      const permissions = await PermissionService.getUserPermissions(user.id);

      // Fire-and-forget login notification
      if (metadata?.ipAddress) {
        NotificationService.create({
          userId: user.id,
          title: 'New sign-in detected',
          body: `A sign-in occurred from IP ${metadata.ipAddress}.`,
          type: 'info',
          category: 'security',
        }).catch(() => {});
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          preferences: user.preferences,
          permissions: Array.from(permissions),
          createdAt: user.createdAt,
        },
        ...tokens,
      };
    });
  }

  static async verifyMfaAndLogin(
    tempToken: string,
    method: string,
    code: string,
    metadata?: SessionMetadata,
  ): Promise<Result<LoginSuccessResult>> {
    return tryCatch(async () => {
      // Verify temp token
      const { userId } = verifyMfaTempToken(tempToken);

      // Verify MFA code
      const verifyResult = await MfaService.verify(userId, method, code);
      if (!verifyResult.ok) {
        throw new ServiceError('INVALID_INPUT', 'MFA verification failed');
      }
      if (!verifyResult.value.valid) {
        throw new ServiceError('INVALID_INPUT', 'Invalid MFA code');
      }

      // Get user
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) throw new Error('User not found');

      // Update lastLoginAt
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));

      // Create tokens
      const tokens = await this.createTokens(userId, metadata);
      const permissions = await PermissionService.getUserPermissions(userId);

      return {
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          preferences: user.preferences,
          permissions: Array.from(permissions),
          createdAt: user.createdAt,
        },
        ...tokens,
      };
    });
  }

  static async refresh(refreshToken: string, metadata?: SessionMetadata): Promise<Result<AuthTokens>> {
    return tryCatch(async () => {
      // Verify token signature
      const payload = verifyRefreshToken(refreshToken);

      // Find session in database by hashed token
      const hashedToken = hashToken(refreshToken);
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.refreshToken, hashedToken));

      if (!session || session.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
      }

      // Delete old session (rotate tokens)
      await db.delete(sessions).where(eq(sessions.id, session.id));

      // Create new tokens
      return await this.createTokens(payload.userId, metadata);
    });
  }

  static async logout(refreshToken: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const hashedToken = hashToken(refreshToken);
      await db.delete(sessions).where(eq(sessions.refreshToken, hashedToken));
    });
  }

  static async getUser(userId: string): Promise<Result<UserResponse>> {
    return tryCatch(async () => {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          isAdmin: users.isAdmin,
          preferences: users.preferences,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      // Get user permissions
      const permissions = await PermissionService.getUserPermissions(user.id);

      return {
        ...user,
        permissions: Array.from(permissions),
      };
    });
  }

  private static async createTokens(userId: string, metadata?: SessionMetadata): Promise<AuthTokens> {
    const refreshToken = signRefreshToken({ userId });

    // Store hashed refresh token in database with metadata
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    const [session] = await db.insert(sessions).values({
      userId,
      refreshToken: hashToken(refreshToken),
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      lastUsedAt: new Date(),
      expiresAt,
    }).returning({ id: sessions.id });

    const accessToken = signAccessToken({ userId, sessionId: session!.id });

    return { accessToken, refreshToken };
  }
}
