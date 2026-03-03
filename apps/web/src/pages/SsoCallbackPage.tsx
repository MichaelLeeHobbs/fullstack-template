// ===========================================
// SSO Callback Page
// ===========================================
// Handles the SSO callback after IdP authentication.
// Exchanges the auth code for JWT tokens.

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
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { api } from '../api/client.js';

type CallbackStatus = 'processing' | 'success' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  idp_error: 'The identity provider returned an error. Please try again.',
  missing_params: 'Invalid callback parameters. Please try signing in again.',
  provider_not_found: 'SSO provider not found. Please contact your administrator.',
  callback_failed: 'Authentication failed. Please try again.',
  user_creation_disabled: 'Automatic account creation is disabled. Please contact your administrator.',
  domain_not_allowed: 'Your email domain is not allowed for this SSO provider.',
  resolve_failed: 'Failed to resolve your account. Please try again.',
  internal: 'An internal error occurred. Please try again.',
};

import type { User } from '@fullstack-template/shared';

interface SsoExchangeResponse {
  user: User;
  accessToken: string;
}

export function SsoCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const returnUrl = searchParams.get('returnUrl');

  const [status, setStatus] = useState<CallbackStatus>(error ? 'error' : 'processing');
  const [errorMessage, setErrorMessage] = useState(
    error ? ERROR_MESSAGES[error] || 'An unknown error occurred.' : '',
  );

  useEffect(() => {
    if (!code || error) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await api.post<SsoExchangeResponse>('/sso/exchange', { code }, { skipAuth: true });
        if (cancelled) return;

        setAuth(data.user, data.accessToken);
        setStatus('success');

        const { intendedDestination, setIntendedDestination } = useAuthStore.getState();
        const destination = returnUrl || intendedDestination || '/home';
        setIntendedDestination(null);
        navigate(destination, { replace: true });
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to complete SSO sign-in');
      }
    })();

    return () => { cancelled = true; };
  }, [code, error, returnUrl, setAuth, navigate]);

  if (status === 'processing') {
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
              Completing sign-in...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we finish setting up your session.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

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
              Sign-in Failed
            </Typography>

            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>

            <Button variant="contained" fullWidth component={RouterLink} to="/login" size="large">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Success state (brief — user is navigated away immediately)
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
            Redirecting...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
