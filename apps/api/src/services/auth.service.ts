// ===========================================
// Auth Service
// ===========================================
// Handles user registration, login, token refresh, and logout.
// All methods return Result<T> using tryCatch from stderr-lib.

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { tryCatch, type Result, type StdError } from 'stderr-lib';
import { db } from '../lib/db.js';
import { users, sessions, emailVerificationTokens, type UserPreferences, ACCOUNT_TYPES } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { PermissionService } from './permission.service.js';
import { EmailService } from './email.service.js';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 7;

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

export interface LoginResult {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async register(email: string, password: string): Promise<Result<RegisterResult>> {
    return tryCatch(async () => {
      // Check + hash outside transaction (read-only + CPU-bound)
      const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existing) {
        throw new Error('Email already exists');
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
      await EmailService.sendVerificationEmail(user.email, verificationToken);
      const tokens = await this.createTokens(user.id);
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

  static async login(email: string, password: string): Promise<Result<LoginResult>> {
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

      // Verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new Error('Invalid credentials');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      // Check if account is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Update lastLoginAt
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Generate tokens
      const tokens = await this.createTokens(user.id);

      // Get user permissions
      const permissions = await PermissionService.getUserPermissions(user.id);

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

  static async refresh(refreshToken: string): Promise<Result<AuthTokens>> {
    return tryCatch(async () => {
      // Verify token signature
      const payload = verifyRefreshToken(refreshToken);

      // Find session in database
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.refreshToken, refreshToken));

      if (!session || session.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
      }

      // Delete old session (rotate tokens)
      await db.delete(sessions).where(eq(sessions.id, session.id));

      // Create new tokens
      return await this.createTokens(payload.userId);
    });
  }

  static async logout(refreshToken: string): Promise<Result<void>> {
    return tryCatch(async () => {
      await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
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

  private static async createTokens(userId: string): Promise<AuthTokens> {
    const accessToken = signAccessToken({ userId });
    const refreshToken = signRefreshToken({ userId });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    await db.insert(sessions).values({
      userId,
      refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
