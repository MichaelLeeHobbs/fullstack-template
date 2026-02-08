// ===========================================
// Verify Email Page
// ===========================================
// Verifies email using token from URL query parameter.

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { accountApi } from '../api/account.api.js';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'no-token';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<VerificationStatus>(token ? 'verifying' : 'no-token');

  const verifyEmail = useMutation({
    mutationFn: accountApi.verifyEmail,
    onSuccess: () => {
      setStatus('success');
    },
    onError: () => {
      setStatus('error');
    },
  });

  // Auto-verify on mount if token is present
  useEffect(() => {
    if (token && status === 'verifying') {
      verifyEmail.mutate({ token });
    }
  }, [token]);

  // Verifying state
  if (status === 'verifying') {
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
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              Verifying your email...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we verify your email address.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Success state
  if (status === 'success') {
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
              Email Verified!
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              Your email has been verified successfully. You can now login to your account.
            </Alert>

            <Button variant="contained" fullWidth component={RouterLink} to="/login" size="large">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Error state
  if (status === 'error') {
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
              Verification Failed
            </Typography>

            <Alert severity="error" sx={{ mb: 3 }}>
              This verification link is invalid or has expired.
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              If you haven't verified your email yet, please login and request a new verification
              email.
            </Typography>

            <Button variant="contained" fullWidth component={RouterLink} to="/login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // No token state
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
            Invalid Link
          </Typography>

          <Alert severity="error" sx={{ mb: 3 }}>
            No verification token found. Please check your email for the verification link.
          </Alert>

          <Button variant="contained" fullWidth component={RouterLink} to="/login">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
