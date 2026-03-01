// ===========================================
// Auth Store
// ===========================================
// Manages authentication state with localStorage persistence.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserPreferences } from '@fullstack-template/shared';

export type { User, UserPreferences };

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  intendedDestination: string | null;
  mfaTempToken: string | null;
  mfaMethods: string[];
  setAuth: (user: User, accessToken: string) => void;
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
      isAuthenticated: false,
      isLoading: false,
      intendedDestination: null,
      mfaTempToken: null,
      mfaMethods: [],
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true, isLoading: false, mfaTempToken: null, mfaMethods: [] }),
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
          isAuthenticated: false,
          isLoading: false,
          intendedDestination: null,
          mfaTempToken: null,
          mfaMethods: [],
        }),
    }),
    {
      name: 'auth-storage',
      // Only persist user + isAuthenticated — never persist accessToken (XSS risk).
      // On reload the app bootstraps a fresh accessToken via httpOnly cookie refresh.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
