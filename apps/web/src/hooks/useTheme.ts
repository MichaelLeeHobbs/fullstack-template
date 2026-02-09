// ===========================================
// Theme Hook
// ===========================================
// Resolves system preference and returns the active theme.

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useThemeStore, type ThemeMode } from '../stores/theme.store.js';
import { lightTheme, darkTheme } from '../styles/theme.js';

// Subscribe to system color scheme changes
function subscribeToMediaQuery(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useTheme() {
  const { mode, setMode } = useThemeStore();

  // Subscribe to system preference changes
  const systemPreference = useSyncExternalStore(
    subscribeToMediaQuery,
    getSystemPreference,
    () => 'light' as const
  );

  const resolvedMode = mode === 'system' ? systemPreference : mode;
  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    const nextMode: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(nextMode);
  }, [mode, setMode]);

  return useMemo(
    () => ({
      theme,
      mode,
      resolvedMode,
      setMode,
      toggleTheme,
      isDark: resolvedMode === 'dark',
    }),
    [theme, mode, resolvedMode, setMode, toggleTheme]
  );
}

