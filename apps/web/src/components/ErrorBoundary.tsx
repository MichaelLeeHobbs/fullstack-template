// ===========================================
// Error Boundary
// ===========================================
// Catches React errors and displays fallback UI.

import { Component, type ReactNode } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';
import { Sentry, sentryEnabled } from '../lib/sentry.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (sentryEnabled) {
      Sentry.withScope((scope) => {
        scope.setExtra('componentStack', errorInfo.componentStack);
        Sentry.captureException(error);
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: '60vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <ErrorOutline sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We're sorry, an unexpected error occurred.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button variant="contained" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button variant="outlined" onClick={() => { window.location.href = '/'; }}>
                Go Home
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
