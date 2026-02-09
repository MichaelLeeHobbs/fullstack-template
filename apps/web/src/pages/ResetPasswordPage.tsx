// ===========================================
// Reset Password Page
// ===========================================
// Set a new password using token from email.

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
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { passwordSchema } from '@fullstack-template/shared';
import { accountApi } from '../api/account.api.js';
import { useNotification } from '../hooks/useNotification.js';

// Schema for the form (without token since it comes from URL)
const resetFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormInput = z.infer<typeof resetFormSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotification();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const resetPassword = useMutation({
    mutationFn: accountApi.resetPassword,
    onSuccess: () => {
      notify.success('Password reset successfully! Please login with your new password.');
      navigate('/login', { replace: true });
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to reset password');
    },
  });

  const onSubmit = (data: ResetFormInput) => {
    if (!token) {
      notify.error('Invalid reset link');
      return;
    }
    resetPassword.mutate({ token, password: data.password });
  };

  // No token in URL
  if (!token) {
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
              Invalid Reset Link
            </Typography>

            <Alert severity="error" sx={{ mb: 2 }}>
              This password reset link is invalid or has expired.
            </Alert>

            <Button variant="contained" fullWidth component={RouterLink} to="/forgot-password">
              Request New Reset Link
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
            Reset Password
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} align="center">
            Enter your new password below.
          </Typography>

          {resetPassword.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetPassword.error?.message || 'Failed to reset password. The link may have expired.'}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('password')}
              label="New Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message || 'At least 8 characters'}
              autoComplete="new-password"
              autoFocus
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
              disabled={resetPassword.isPending || !isValid}
            >
              {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Remember your password?{' '}
            <Link component={RouterLink} to="/login">
              Login
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
