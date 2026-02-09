// ===========================================
// Protected Route
// ===========================================
// Redirects to login if not authenticated.

import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';

export function ProtectedRoute() {
  const { isAuthenticated, setIntendedDestination } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setIntendedDestination(location.pathname);
    }
  }, [isAuthenticated, location.pathname, setIntendedDestination]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

