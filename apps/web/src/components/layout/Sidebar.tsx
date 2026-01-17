// ===========================================
// Sidebar Navigation
// ===========================================
// Collapsible sidebar with navigation links.

import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  Typography,
  Box,
} from '@mui/material';
import { Home, Settings, People, History } from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store.js';

const DRAWER_WIDTH = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant: 'permanent' | 'temporary';
}

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

export function Sidebar({ open, onClose, variant }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();

  // Main navigation items - expand as features are added
  const navItems: NavItem[] = [
    { text: 'Home', icon: <Home />, path: '/home' },
  ];

  // Admin items - only shown to admins
  const adminItems: NavItem[] = user?.isAdmin
    ? [
        { text: 'Users', icon: <People />, path: '/admin/users' },
        { text: 'Settings', icon: <Settings />, path: '/admin/settings' },
        { text: 'Audit Logs', icon: <History />, path: '/admin/audit-logs' },
      ]
    : [];

  const renderNavItem = (item: NavItem) => (
    <ListItem key={item.path} disablePadding>
      <ListItemButton
        component={Link}
        to={item.path}
        selected={location.pathname === item.path}
        onClick={variant === 'temporary' ? onClose : undefined}
        sx={{
          '&.Mui-selected': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          },
        }}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar /> {/* Spacer for AppBar */}

      <List>{navItems.map(renderNavItem)}</List>

      {adminItems.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Admin
            </Typography>
          </Box>
          <List>{adminItems.map(renderNavItem)}</List>
        </>
      )}
    </Drawer>
  );
}

export { DRAWER_WIDTH };
