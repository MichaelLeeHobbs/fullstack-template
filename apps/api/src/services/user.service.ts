// ===========================================
// User Service
// ===========================================
// Handles user profile and preferences management.

import bcrypt from 'bcrypt';
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { users, type UserPreferences, defaultPreferences } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

export interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
  preferences: UserPreferences;
  createdAt: Date;
}

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<Result<UserProfile>> {
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

      return user;
    });
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<Result<void>> {
    return tryCatch(async () => {
      const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId));
    });
  }

  /**
   * Get user preferences
   */
  static async getPreferences(userId: string): Promise<Result<UserPreferences>> {
    return tryCatch(async () => {
      const [user] = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      return user.preferences ?? defaultPreferences;
    });
  }

  /**
   * Update user preferences (partial update)
   */
  static async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<Result<UserPreferences>> {
    return tryCatch(async () => {
      const [user] = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      const currentPrefs = user.preferences ?? defaultPreferences;
      const newPreferences: UserPreferences = { ...currentPrefs, ...updates };

      await db
        .update(users)
        .set({ preferences: newPreferences, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return newPreferences;
    });
  }
}
