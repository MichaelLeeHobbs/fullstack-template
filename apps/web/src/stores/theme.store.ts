// ===========================================
// Theme Store
// ===========================================
// Persists theme preference to localStorage.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
      toggleMode: () => {
        const current = get().mode;
        // Cycle: light -> dark -> system -> light
        const next: ThemeMode = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        set({ mode: next });
      },
    }),
    { name: 'theme-storage' }
  )
);

