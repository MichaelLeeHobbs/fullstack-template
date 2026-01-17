// ===========================================
// Footer Component
// ===========================================
// Minimal footer with copyright and version.

import { Box, Typography } from '@mui/material';

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
        © {year} App Name • v0.1.0
      </Typography>
    </Box>
  );
}
