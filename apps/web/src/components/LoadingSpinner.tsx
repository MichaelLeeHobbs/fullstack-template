// ===========================================
// Loading Spinner Components
// ===========================================

import { CircularProgress, Box, Typography, type BoxProps } from '@mui/material';

interface LoadingSpinnerProps extends BoxProps {
  size?: number;
}

/**
 * Inline loading spinner
 */
export function LoadingSpinner({ size = 40, sx, ...props }: LoadingSpinnerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
        ...sx,
      }}
      {...props}
    >
      <CircularProgress size={size} />
    </Box>
  );
}

interface PageLoaderProps {
  message?: string;
}

/**
 * Full page loading spinner
 */
export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress size={48} sx={{ mb: 2 }} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
