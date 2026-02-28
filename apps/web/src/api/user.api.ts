// ===========================================
// User API
// ===========================================
// API calls for user profile and preferences.

import { api } from './client.js';
import type { UserPreferences, UserProfile } from '@fullstack-template/shared';

export type { UserPreferences, UserProfile };

export const userApi = {
  /**
   * Get current user profile
   */
  getProfile: () => api.get<UserProfile>('/users/me'),

  /**
   * Change password
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string }>('/users/me/password', {
      currentPassword,
      newPassword,
    }),

  /**
   * Get preferences
   */
  getPreferences: () => api.get<UserPreferences>('/users/me/preferences'),

  /**
   * Update preferences
   */
  updatePreferences: (preferences: Partial<UserPreferences>) =>
    api.patch<UserPreferences>('/users/me/preferences', preferences),
};
