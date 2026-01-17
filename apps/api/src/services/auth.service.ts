// ===========================================
// Auth Service
// ===========================================
// Handles user registration, login, token refresh, and logout.
// All methods return Result<T> using tryCatch from stderr-lib.

import bcrypt from 'bcrypt';
import { tryCatch, type Result, type StdError } from 'stderr-lib';
import { db } from '../lib/db.js';
import { users, sessions, type UserPreferences } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';

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

// Helper to wrap async operations with tryCatch - properly typed
async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, StdError>> {
  return await (tryCatch(fn) as unknown as Promise<Result<T, StdError>>);
}

export class AuthService {
  static async register(email: string, password: string): Promise<Result<RegisterResult>> {
    return tryAsync(async () => {
      // Check if email exists
      const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existing) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const [user] = await db
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

      // Generate tokens
      const tokens = await this.createTokens(user.id);

      return {
        user,
        ...tokens,
      };
    });
  }

  static async login(email: string, password: string): Promise<Result<LoginResult>> {
    return tryAsync(async () => {
      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new Error('Invalid credentials');
      }

      // Update lastLoginAt
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Generate tokens
      const tokens = await this.createTokens(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          preferences: user.preferences,
          createdAt: user.createdAt,
        },
        ...tokens,
      };
    });
  }

  static async refresh(refreshToken: string): Promise<Result<AuthTokens>> {
    return tryAsync(async () => {
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
    return tryAsync(async () => {
      await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
    });
  }

  static async getUser(userId: string): Promise<Result<UserResponse>> {
    return tryAsync(async () => {
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

      return user;
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

