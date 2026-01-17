// ===========================================
// App Header
// ===========================================

import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { useLogout } from '../../hooks/useAuth.js';

export function Header() {
  const { isAuthenticated, user } = useAuthStore();
  const logout = useLogout();

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 700,
          }}
        >
          App Name
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <ThemeToggle />

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              Logout
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            <Button component={RouterLink} to="/login" variant="text">
              Login
            </Button>
            <Button component={RouterLink} to="/register" variant="contained">
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

