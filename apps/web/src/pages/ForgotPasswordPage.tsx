// ===========================================
// Forgot Password Page
// ===========================================
// Request a password reset email.

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
import { Link as RouterLink } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@fullstack-template/shared';
import { accountApi } from '../api/account.api.js';

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const forgotPassword = useMutation({
    mutationFn: accountApi.forgotPassword,
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    },
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPassword.mutate(data);
  };

  if (submitted) {
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
              If an account exists with that email, we've sent password reset instructions.
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The link in the email will expire in 1 hour. If you don't see the email, check your
              spam folder.
            </Typography>

            <Button
              variant="outlined"
              fullWidth
              component={RouterLink}
              to="/login"
              sx={{ mt: 2 }}
            >
              Back to Login
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
            Forgot Password
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} align="center">
            Enter your email address and we'll send you a link to reset your password.
          </Typography>

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
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3 }}
              disabled={forgotPassword.isPending}
            >
              {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
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
