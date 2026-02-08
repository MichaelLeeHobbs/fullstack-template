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
  permissions: string[];
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  intendedDestination: string | null;
  mfaTempToken: string | null;
  mfaMethods: string[];
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setLoading: (isLoading: boolean) => void;
  setIntendedDestination: (path: string | null) => void;
  setMfaRequired: (tempToken: string, methods: string[]) => void;
  clearMfa: () => void;
  updatePreferences: (preferences: UserPreferences) => void;
  updatePermissions: (permissions: string[]) => void;
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
      mfaTempToken: null,
      mfaMethods: [],
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false, mfaTempToken: null, mfaMethods: [] }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setLoading: (isLoading) => set({ isLoading }),
      setIntendedDestination: (path) => set({ intendedDestination: path }),
      setMfaRequired: (tempToken, methods) => set({ mfaTempToken: tempToken, mfaMethods: methods }),
      clearMfa: () => set({ mfaTempToken: null, mfaMethods: [] }),
      updatePreferences: (preferences) =>
        set((state) => ({
          user: state.user ? { ...state.user, preferences } : null,
        })),
      updatePermissions: (permissions) =>
        set((state) => ({
          user: state.user ? { ...state.user, permissions } : null,
        })),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          intendedDestination: null,
          mfaTempToken: null,
          mfaMethods: [],
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
