// ===========================================
// Account Lockout Service
// ===========================================
// Manages failed login attempts and account lockout.

import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { users } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { SettingsService } from './settings.service.js';

interface LockoutConfig {
  maxAttempts: number;
  lockoutDurationMinutes: number;
}

interface LockStatus {
  locked: boolean;
  minutesRemaining: number;
}

interface FailedAttemptResult {
  locked: boolean;
  attemptsRemaining: number;
}

export class AccountLockoutService {
  private static async getConfig(): Promise<LockoutConfig> {
    const maxAttempts = await SettingsService.get<number>('security.max_login_attempts', 5);
    const lockoutDurationMinutes = await SettingsService.get<number>('security.lockout_duration_minutes', 15);
    return { maxAttempts, lockoutDurationMinutes };
  }

  static async isLocked(userId: string): Promise<Result<LockStatus>> {
    return tryCatch(async () => {
      const [user] = await db
        .select({ lockedUntil: users.lockedUntil })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) throw new Error('User not found');

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
        );
        return { locked: true, minutesRemaining };
      }

      return { locked: false, minutesRemaining: 0 };
    });
  }

  static async recordFailedAttempt(userId: string): Promise<Result<FailedAttemptResult>> {
    return tryCatch(async () => {
      const config = await this.getConfig();

      // Atomic increment and return new count
      const [updated] = await db
        .update(users)
        .set({
          failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        })
        .where(eq(users.id, userId))
        .returning({ failedLoginAttempts: users.failedLoginAttempts });

      if (!updated) throw new Error('User not found');

      const newCount = updated.failedLoginAttempts;

      if (newCount >= config.maxAttempts) {
        // Lock the account
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + config.lockoutDurationMinutes);

        await db
          .update(users)
          .set({ lockedUntil })
          .where(eq(users.id, userId));

        return { locked: true, attemptsRemaining: 0 };
      }

      return { locked: false, attemptsRemaining: config.maxAttempts - newCount };
    });
  }

  static async resetAttempts(userId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      await db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, userId));
    });
  }
}
