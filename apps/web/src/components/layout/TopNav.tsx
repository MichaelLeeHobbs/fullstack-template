// ===========================================
// Top Navigation Bar
// ===========================================
// AppBar with logo, theme toggle, and user menu.

import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Brightness4,
  Brightness7,
  Settings,
  Person,
  Logout,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store.js';
import { useThemeStore } from '../../stores/theme.store.js';
import { APP_NAME } from '../../lib/constants.js';
import { useLogout } from '../../hooks/useAuth.js';
import { NotificationBell } from '../ui/NotificationBell.js';

interface TopNavProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const { mode, toggleMode } = useThemeStore();
  const logout = useLogout();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout.mutate(undefined, {
      onSuccess: () => {
        clearAuth();
        navigate('/login');
      },
    });
  };

  const handleNavigate = (path: string) => {
    handleMenuClose();
    navigate(path);
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {showMenuButton && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          component={RouterLink}
          to={isAuthenticated ? '/home' : '/'}
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 700,
            flexGrow: 1,
          }}
        >
          {APP_NAME}
        </Typography>

        <Tooltip title={mode === 'light' ? 'Dark mode' : mode === 'dark' ? 'System mode' : 'Light mode'}>
          <IconButton color="inherit" onClick={toggleMode}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>

        {isAuthenticated ? (
          <>
            <NotificationBell />
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              sx={{ ml: 1 }}
              aria-label="Account menu"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.isAdmin ? 'Administrator' : 'User'}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => handleNavigate('/profile')}>
                <Person sx={{ mr: 1 }} fontSize="small" />
                Profile
              </MenuItem>
              {user?.isAdmin && (
                <MenuItem onClick={() => handleNavigate('/admin/settings')}>
                  <Settings sx={{ mr: 1 }} fontSize="small" />
                  Admin Settings
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
            <Button color="inherit" component={RouterLink} to="/login">
              Login
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              component={RouterLink}
              to="/register"
            >
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
