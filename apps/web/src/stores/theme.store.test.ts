// ===========================================
// Theme Store Tests
// ===========================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './theme.store.js';

describe('Theme Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useThemeStore.setState({ mode: 'system' });
  });

  describe('initial state', () => {
    it('should default to system mode', () => {
      const { mode } = useThemeStore.getState();
      expect(mode).toBe('system');
    });
  });

  describe('setMode', () => {
    it('should set mode to light', () => {
      useThemeStore.getState().setMode('light');
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('should set mode to dark', () => {
      useThemeStore.getState().setMode('dark');
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('should set mode to system', () => {
      useThemeStore.getState().setMode('dark'); // Change first
      useThemeStore.getState().setMode('system');
      expect(useThemeStore.getState().mode).toBe('system');
    });
  });
});

