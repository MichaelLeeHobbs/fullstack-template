// ===========================================
// Admin Route Component
// ===========================================
// Protects routes that require admin access.
// Uses permission-based access control.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { CircularProgress, Container } from '@mui/material';
import { PERMISSIONS } from '@fullstack-template/shared';

// Admin permissions - user needs at least one to access admin routes
const ADMIN_PERMISSIONS = [
  PERMISSIONS.USERS_READ,
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.SETTINGS_READ,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.API_KEYS_READ,
  PERMISSIONS.SERVICE_ACCOUNTS_READ,
  PERMISSIONS.CA_READ,
];

export function AdminRoute() {
  const { isAuthenticated, user, isLoading, setIntendedDestination } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated) {
    setIntendedDestination(location.pathname);
    return <Navigate to="/login" replace />;
  }

  // Check if user has any admin permission
  const hasAdminAccess =
    user?.isAdmin || user?.permissions?.some((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p));

  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
