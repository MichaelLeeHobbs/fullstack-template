// ===========================================
// Theme Hook Tests
// ===========================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeStore } from '../stores/theme.store.js';
import { useTheme } from './useTheme.js';

function setMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }),
  });
}

describe('useTheme', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
    setMatchMedia(false);
  });

  it('should resolve light mode directly', () => {
    useThemeStore.setState({ mode: 'light' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedMode).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('should resolve dark mode directly', () => {
    useThemeStore.setState({ mode: 'dark' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedMode).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should resolve system mode to light when system prefers light', () => {
    setMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedMode).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('should resolve system mode to dark when system prefers dark', () => {
    setMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedMode).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should cycle theme on toggleTheme: light -> dark -> system -> light', () => {
    useThemeStore.setState({ mode: 'light' });
    const { result } = renderHook(() => useTheme());

    act(() => { result.current.toggleTheme(); });
    expect(useThemeStore.getState().mode).toBe('dark');

    act(() => { result.current.toggleTheme(); });
    expect(useThemeStore.getState().mode).toBe('system');

    act(() => { result.current.toggleTheme(); });
    expect(useThemeStore.getState().mode).toBe('light');
  });
});
