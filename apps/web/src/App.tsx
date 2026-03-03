// ===========================================
// App Component
// ===========================================
// Root component with providers and routing.

import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { SocketProvider } from './providers/SocketProvider.js';
import { useTheme } from './hooks/useTheme.js';
import { useAuthStore } from './stores/auth.store.js';
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
import { SsoCallbackPage } from './pages/SsoCallbackPage.js';

// Admin pages — lazy loaded (only admins need these)
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage.js').then(m => ({ default: m.SettingsPage })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage.js').then(m => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import('./pages/admin/RolesPage.js').then(m => ({ default: m.RolesPage })));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage.js').then(m => ({ default: m.AuditLogsPage })));
const ApiKeysPage = lazy(() => import('./pages/admin/ApiKeysPage.js').then(m => ({ default: m.ApiKeysPage })));
const ServiceAccountsPage = lazy(() => import('./pages/admin/ServiceAccountsPage.js').then(m => ({ default: m.ServiceAccountsPage })));
const SsoPage = lazy(() => import('./pages/admin/SsoPage.js').then(m => ({ default: m.SsoPage })));

// PKI pages — lazy loaded
const PkiDashboardPage = lazy(() => import('./pages/pki/PkiDashboardPage.js').then(m => ({ default: m.PkiDashboardPage })));
const CaListPage = lazy(() => import('./pages/pki/CaListPage.js').then(m => ({ default: m.CaListPage })));
const CaCreatePage = lazy(() => import('./pages/pki/CaCreatePage.js').then(m => ({ default: m.CaCreatePage })));
const CaDetailPage = lazy(() => import('./pages/pki/CaDetailPage.js').then(m => ({ default: m.CaDetailPage })));
const CertificateListPage = lazy(() => import('./pages/pki/CertificateListPage.js').then(m => ({ default: m.CertificateListPage })));
const CertificateIssuePage = lazy(() => import('./pages/pki/CertificateIssuePage.js').then(m => ({ default: m.CertificateIssuePage })));
const CertificateDetailPage = lazy(() => import('./pages/pki/CertificateDetailPage.js').then(m => ({ default: m.CertificateDetailPage })));
const CsrListPage = lazy(() => import('./pages/pki/CsrListPage.js').then(m => ({ default: m.CsrListPage })));
const CsrDetailPage = lazy(() => import('./pages/pki/CsrDetailPage.js').then(m => ({ default: m.CsrDetailPage })));
const ProfileListPage = lazy(() => import('./pages/pki/ProfileListPage.js').then(m => ({ default: m.ProfileListPage })));
const ProfileFormPage = lazy(() => import('./pages/pki/ProfileFormPage.js').then(m => ({ default: m.ProfileFormPage })));
const PkiAuditPage = lazy(() => import('./pages/pki/PkiAuditPage.js').then(m => ({ default: m.PkiAuditPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

/**
 * On page reload, accessToken is not persisted (security).
 * If the user was previously authenticated, attempt a silent refresh
 * using the httpOnly refresh cookie to get a new accessToken.
 */
function useTokenBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [ready, setReady] = useState(!isAuthenticated || !!accessToken);

  useEffect(() => {
    if (!isAuthenticated || accessToken) {
      setReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setAccessToken(data.data.accessToken);
          } else {
            clearAuth();
          }
        }
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, accessToken, setAccessToken, clearAuth]);

  return ready;
}

function AppWithTheme() {
  const { theme } = useTheme();
  const ready = useTokenBootstrap();

  if (!ready) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PageLoader />
      </ThemeProvider>
    );
  }

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
            <Route path="/sso/callback" element={<SsoCallbackPage />} />
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
              <Route path="/admin/sso" element={<Suspense fallback={<PageLoader />}><SsoPage /></Suspense>} />

              {/* PKI routes */}
              <Route path="/pki" element={<Suspense fallback={<PageLoader />}><PkiDashboardPage /></Suspense>} />
              <Route path="/pki/ca" element={<Suspense fallback={<PageLoader />}><CaListPage /></Suspense>} />
              <Route path="/pki/ca/create" element={<Suspense fallback={<PageLoader />}><CaCreatePage /></Suspense>} />
              <Route path="/pki/ca/:id" element={<Suspense fallback={<PageLoader />}><CaDetailPage /></Suspense>} />
              <Route path="/pki/certificates" element={<Suspense fallback={<PageLoader />}><CertificateListPage /></Suspense>} />
              <Route path="/pki/certificates/issue" element={<Suspense fallback={<PageLoader />}><CertificateIssuePage /></Suspense>} />
              <Route path="/pki/certificates/:id" element={<Suspense fallback={<PageLoader />}><CertificateDetailPage /></Suspense>} />
              <Route path="/pki/requests" element={<Suspense fallback={<PageLoader />}><CsrListPage /></Suspense>} />
              <Route path="/pki/requests/:id" element={<Suspense fallback={<PageLoader />}><CsrDetailPage /></Suspense>} />
              <Route path="/pki/profiles" element={<Suspense fallback={<PageLoader />}><ProfileListPage /></Suspense>} />
              <Route path="/pki/profiles/create" element={<Suspense fallback={<PageLoader />}><ProfileFormPage /></Suspense>} />
              <Route path="/pki/profiles/:id" element={<Suspense fallback={<PageLoader />}><ProfileFormPage /></Suspense>} />
              <Route path="/pki/audit" element={<Suspense fallback={<PageLoader />}><PkiAuditPage /></Suspense>} />
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
