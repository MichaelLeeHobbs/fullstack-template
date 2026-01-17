// ===========================================
// Public Layout
// ===========================================
// Layout for public pages (no sidebar).

import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav.js';
import { Footer } from './Footer.js';

export function PublicLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav showMenuButton={false} />
      <Toolbar /> {/* Spacer for fixed AppBar */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
}
