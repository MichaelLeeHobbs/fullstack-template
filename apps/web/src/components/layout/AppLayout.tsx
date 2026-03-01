// ===========================================
// App Layout
// ===========================================
// Main layout with TopNav, Sidebar, and Footer.

import { useState } from 'react';
import { Alert, Box, Collapse, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav.js';
import { Sidebar, DRAWER_WIDTH } from './Sidebar.js';
import { Footer } from './Footer.js';
import { useSocketStore } from '../../stores/socket.store.js';

export function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const connectionError = useSocketStore((s) => s.connectionError);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TopNav onMenuClick={handleToggleSidebar} showMenuButton />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isMobile ? 'temporary' : 'permanent'}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: isMobile ? 0 : `${DRAWER_WIDTH}px`,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Collapse in={!!connectionError}>
          <Alert severity="warning" sx={{ borderRadius: 0 }}>
            Real-time updates unavailable — {connectionError}
          </Alert>
        </Collapse>
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Outlet />
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}

