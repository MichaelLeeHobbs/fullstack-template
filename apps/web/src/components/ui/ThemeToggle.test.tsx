// ===========================================
// Theme Toggle Tests
// ===========================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useThemeStore } from '../../stores/theme.store.js';
import { ThemeToggle } from './ThemeToggle.js';

// Mock useTheme to avoid matchMedia issues during render
vi.mock('../../hooks/useTheme.js', () => ({
  useTheme: () => {
    const store = useThemeStore();
    return {
      mode: store.mode,
      toggleTheme: store.toggleMode,
    };
  },
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
  });

  it('should render a button', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show BrightnessAuto icon for system mode', () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId('BrightnessAutoIcon')).toBeInTheDocument();
  });

  it('should show Brightness7 icon for light mode', () => {
    useThemeStore.setState({ mode: 'light' });
    render(<ThemeToggle />);
    expect(screen.getByTestId('Brightness7Icon')).toBeInTheDocument();
  });

  it('should show Brightness4 icon for dark mode', () => {
    useThemeStore.setState({ mode: 'dark' });
    render(<ThemeToggle />);
    expect(screen.getByTestId('Brightness4Icon')).toBeInTheDocument();
  });

  it('should call toggleTheme on click', async () => {
    const user = userEvent.setup();
    useThemeStore.setState({ mode: 'light' });

    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));

    // light -> dark (toggleMode cycles)
    expect(useThemeStore.getState().mode).toBe('dark');
  });
});
