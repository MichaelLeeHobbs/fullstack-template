// ===========================================
// App Component
// ===========================================
// Root component with providers and routing.

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { SocketProvider } from './providers/SocketProvider.js';
import { useTheme } from './hooks/useTheme.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { PageLoader } from './components/LoadingSpinner.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { PublicLayout } from './components/layout/PublicLayout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AdminRoute } from './components/AdminRoute.js';

// Pages — eagerly loaded (common routes)
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/ResetPasswordPage.js';
import { VerifyEmailPage } from './pages/VerifyEmailPage.js';
import { HomePage } from './pages/HomePage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { SessionsPage } from './pages/SessionsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Admin pages — lazy loaded (only admins need these)
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage.js').then(m => ({ default: m.SettingsPage })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage.js').then(m => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import('./pages/admin/RolesPage.js').then(m => ({ default: m.RolesPage })));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage.js').then(m => ({ default: m.AuditLogsPage })));
const ApiKeysPage = lazy(() => import('./pages/admin/ApiKeysPage.js').then(m => ({ default: m.ApiKeysPage })));
const ServiceAccountsPage = lazy(() => import('./pages/admin/ServiceAccountsPage.js').then(m => ({ default: m.ServiceAccountsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppWithTheme() {
  const { theme } = useTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public pages (no sidebar) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>

          {/* Protected pages (with sidebar) */}
          <Route element={<AppLayout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/sessions" element={<SessionsPage />} />
            </Route>

            {/* Admin pages (lazy loaded) */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
              <Route path="/admin/roles" element={<Suspense fallback={<PageLoader />}><RolesPage /></Suspense>} />
              <Route path="/admin/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="/admin/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>} />
              <Route path="/admin/api-keys" element={<Suspense fallback={<PageLoader />}><ApiKeysPage /></Suspense>} />
              <Route path="/admin/service-accounts" element={<Suspense fallback={<PageLoader />}><ServiceAccountsPage /></Suspense>} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          autoHideDuration={4000}
        >
          <SocketProvider>
            <AppWithTheme />
          </SocketProvider>
        </SnackbarProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
