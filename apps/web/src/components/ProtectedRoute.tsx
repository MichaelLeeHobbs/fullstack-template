// ===========================================
// Protected Route
// ===========================================
// Redirects to login if not authenticated.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.js';

export function ProtectedRoute() {
  const { isAuthenticated, setIntendedDestination } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Save the intended destination before redirecting
    setIntendedDestination(location.pathname);
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

