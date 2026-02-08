// ===========================================
// Login Page
// ===========================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useMutation } from '@tanstack/react-query';
import { loginSchema, type LoginInput } from '@fullstack-template/shared';
import { useLogin } from '../hooks/useAuth.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useNotification } from '../hooks/useNotification.js';
import { accountApi } from '../api/account.api.js';

export function LoginPage() {
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const login = useLogin();
  const navigate = useNavigate();
  const notify = useNotification();
  const { isAuthenticated, intendedDestination, setIntendedDestination } = useAuthStore();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resendVerification = useMutation({
    mutationFn: () => accountApi.forgotPassword({ email: getValues('email') }),
    onSuccess: () => {
      notify.success('Verification email sent! Please check your inbox.');
    },
    onError: () => {
      notify.error('Failed to resend verification email. Please try again.');
    },
  });

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = (data: LoginInput) => {
    setShowVerificationMessage(false);
    login.mutate(data, {
      onSuccess: () => {
        notify.success('Welcome back!');
        const destination = intendedDestination || '/home';
        setIntendedDestination(null);
        navigate(destination, { replace: true });
      },
      onError: (error) => {
        if (error.message === 'EMAIL_NOT_VERIFIED') {
          setShowVerificationMessage(true);
        } else {
          notify.error(error.message || 'Login failed');
        }
      },
    });
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

          {showVerificationMessage && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Please verify your email before logging in. Check your inbox for the verification
                link.
              </Typography>
              <Button
                size="small"
                onClick={() => resendVerification.mutate()}
                disabled={resendVerification.isPending}
              >
                {resendVerification.isPending ? 'Sending...' : 'Resend verification email'}
              </Button>
            </Alert>
          )}

          {login.isError && !showVerificationMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {login.error?.message || 'Login failed'}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email')}
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
              autoFocus
            />
            <TextField
              {...register('password')}
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              autoComplete="current-password"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Forgot password?
              </Link>
            </Box>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 2 }}
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
