// ===========================================
// App Component
// ===========================================
// Root component with providers and routing.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { useTheme } from './hooks/useTheme.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { PublicLayout } from './components/layout/PublicLayout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AdminRoute } from './components/AdminRoute.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { HomePage } from './pages/HomePage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { SettingsPage } from './pages/admin/SettingsPage.js';
import { UsersPage } from './pages/admin/UsersPage.js';
import { AuditLogsPage } from './pages/admin/AuditLogsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

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
          </Route>

          {/* Protected pages (with sidebar) */}
          <Route element={<AppLayout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin pages */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
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
          <AppWithTheme />
        </SnackbarProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
