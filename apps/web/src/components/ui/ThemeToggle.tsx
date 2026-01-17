// ===========================================
// Theme Toggle Button
// ===========================================

import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7, BrightnessAuto } from '@mui/icons-material';
import { useTheme } from '../../hooks/useTheme.js';

export function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (mode) {
      case 'light':
        return <Brightness7 />;
      case 'dark':
        return <Brightness4 />;
      case 'system':
        return <BrightnessAuto />;
    }
  };

  const getTooltip = () => {
    switch (mode) {
      case 'light':
        return 'Light mode (click for dark)';
      case 'dark':
        return 'Dark mode (click for system)';
      case 'system':
        return 'System mode (click for light)';
    }
  };

  return (
    <Tooltip title={getTooltip()}>
      <IconButton onClick={toggleTheme} color="inherit">
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
}

