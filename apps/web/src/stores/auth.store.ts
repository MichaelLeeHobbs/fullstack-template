// ===========================================
// Auth Store
// ===========================================
// Manages authentication state with localStorage persistence.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
}

export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  preferences: UserPreferences;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  intendedDestination: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setLoading: (isLoading: boolean) => void;
  setIntendedDestination: (path: string | null) => void;
  updatePreferences: (preferences: UserPreferences) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      intendedDestination: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setLoading: (isLoading) => set({ isLoading }),
      setIntendedDestination: (path) => set({ intendedDestination: path }),
      updatePreferences: (preferences) =>
        set((state) => ({
          user: state.user ? { ...state.user, preferences } : null,
        })),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          intendedDestination: null,
        }),
    }),
    {
      name: 'auth-storage',
      // Don't persist intendedDestination
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

