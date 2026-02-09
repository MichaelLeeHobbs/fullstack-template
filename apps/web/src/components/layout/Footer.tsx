// ===========================================
// Footer Component
// ===========================================
// Minimal footer with copyright and version.

import { Box, Typography } from '@mui/material';
import { APP_NAME, APP_VERSION } from '../../lib/constants.js';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        textAlign: 'center',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {year} {APP_NAME} • v{APP_VERSION}
      </Typography>
    </Box>
  );
}
