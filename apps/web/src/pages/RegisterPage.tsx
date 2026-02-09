// ===========================================
// Register Page
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
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '@fullstack-template/shared';
import { useRegister } from '../hooks/useAuth.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useNotification } from '../hooks/useNotification.js';

export function RegisterPage() {
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const registerMutation = useRegister();
  const notify = useNotification();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(
      { email: data.email, password: data.password },
      {
        onSuccess: () => {
          setRegisteredEmail(data.email);
          setRegistrationComplete(true);
        },
        onError: (error) => {
          notify.error(error.message || 'Registration failed');
        },
      }
    );
  };

  // Show verification message after successful registration
  if (registrationComplete) {
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
              Check your email
            </Typography>

            <Alert severity="success" sx={{ mb: 2 }}>
              Account created successfully!
            </Alert>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We've sent a verification link to <strong>{registeredEmail}</strong>. Please click the
              link in the email to verify your account before logging in.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The link will expire in 24 hours. If you don't see the email, check your spam folder.
            </Typography>

            <Button variant="contained" fullWidth component={RouterLink} to="/login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

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
            Create Account
          </Typography>

          {registerMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registerMutation.error?.message || 'Registration failed'}
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
              helperText={errors.password?.message || 'At least 8 characters'}
              autoComplete="new-password"
            />
            <TextField
              {...register('confirmPassword')}
              label="Confirm Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3 }}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Creating account...' : 'Register'}
            </Button>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Login
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
