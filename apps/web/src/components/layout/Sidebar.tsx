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
import {
  Home, Settings, People, History, Security, VpnKey, ManageAccounts,
  Shield, VerifiedUser, Description, Assignment, Policy, GppGood,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useAnyPermission } from '../../hooks/usePermission.js';
import { PERMISSIONS } from '../../types/role.js';

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
  permissions?: string[];
}

export function Sidebar({ open, onClose, variant }: SidebarProps) {
  const location = useLocation();

  // Check permissions for admin sections
  const canViewUsers = useAnyPermission([PERMISSIONS.USERS_READ]);
  const canViewRoles = useAnyPermission([PERMISSIONS.ROLES_READ]);
  const canViewSettings = useAnyPermission([PERMISSIONS.SETTINGS_READ]);
  const canViewAuditLogs = useAnyPermission([PERMISSIONS.AUDIT_READ]);
  const canViewApiKeys = useAnyPermission([PERMISSIONS.API_KEYS_READ]);
  const canViewServiceAccounts = useAnyPermission([PERMISSIONS.SERVICE_ACCOUNTS_READ]);

  // PKI permissions
  const canViewPki = useAnyPermission([PERMISSIONS.CA_READ]);
  const canViewCerts = useAnyPermission([PERMISSIONS.CERTIFICATES_READ]);
  const canViewCsrs = useAnyPermission([PERMISSIONS.CSR_READ]);
  const canViewProfiles = useAnyPermission([PERMISSIONS.PROFILES_READ]);
  const canViewPkiAudit = useAnyPermission([PERMISSIONS.PKI_AUDIT_READ]);

  // Main navigation items - expand as features are added
  const navItems: NavItem[] = [{ text: 'Home', icon: <Home />, path: '/home' }];

  // Admin items - shown based on permissions
  const adminItems: NavItem[] = [
    ...(canViewUsers ? [{ text: 'Users', icon: <People />, path: '/admin/users' }] : []),
    ...(canViewRoles ? [{ text: 'Roles', icon: <Security />, path: '/admin/roles' }] : []),
    ...(canViewSettings ? [{ text: 'Settings', icon: <Settings />, path: '/admin/settings' }] : []),
    ...(canViewAuditLogs
      ? [{ text: 'Audit Logs', icon: <History />, path: '/admin/audit-logs' }]
      : []),
    ...(canViewApiKeys
      ? [{ text: 'API Keys', icon: <VpnKey />, path: '/admin/api-keys' }]
      : []),
    ...(canViewServiceAccounts
      ? [{ text: 'Service Accounts', icon: <ManageAccounts />, path: '/admin/service-accounts' }]
      : []),
  ];

  // PKI items - shown based on permissions
  const pkiItems: NavItem[] = [
    ...(canViewPki ? [{ text: 'Dashboard', icon: <Shield />, path: '/pki' }] : []),
    ...(canViewPki ? [{ text: 'CAs', icon: <GppGood />, path: '/pki/ca' }] : []),
    ...(canViewCerts ? [{ text: 'Certificates', icon: <VerifiedUser />, path: '/pki/certificates' }] : []),
    ...(canViewCsrs ? [{ text: 'Requests', icon: <Description />, path: '/pki/requests' }] : []),
    ...(canViewProfiles ? [{ text: 'Profiles', icon: <Assignment />, path: '/pki/profiles' }] : []),
    ...(canViewPkiAudit ? [{ text: 'PKI Audit', icon: <Policy />, path: '/pki/audit' }] : []),
  ];

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
      {pkiItems.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              PKI
            </Typography>
          </Box>
          <List>{pkiItems.map(renderNavItem)}</List>
        </>
      )}
    </Drawer>
  );
}

export { DRAWER_WIDTH };
