// ===========================================
// Login Page
// ===========================================

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
} from '@mui/material';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useNotification } from '../hooks/useNotification.js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const navigate = useNavigate();
  const notify = useNotification();
  const { isAuthenticated, intendedDestination, setIntendedDestination } = useAuthStore();

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          notify.success('Welcome back!');
          const destination = intendedDestination || '/home';
          setIntendedDestination(null);
          navigate(destination, { replace: true });
        },
        onError: (error) => {
          notify.error(error.message || 'Login failed');
        },
      }
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom align="center">
            Login
          </Typography>

          {login.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {login.error?.message || 'Login failed'}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3 }}
              disabled={login.isPending}
            >
              {login.isPending ? 'Logging in...' : 'Login'}
            </Button>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register">
              Register
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

