// ===========================================
// Admin Route Component
// ===========================================
// Protects routes that require admin access.

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';
import { CircularProgress, Container } from '@mui/material';

export function AdminRoute() {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;

