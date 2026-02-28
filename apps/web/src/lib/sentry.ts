// ===========================================
// Sentry Error Tracking (Frontend)
// ===========================================
// Optional — only active when VITE_SENTRY_DSN is set.

/// <reference types="vite/client" />

import * as Sentry from '@sentry/react';

export const sentryEnabled = !!import.meta.env.VITE_SENTRY_DSN;

if (sentryEnabled) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    release: `web@0.0.1`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
  });
}

export function setSentryUser(user: { id: string; email: string } | null) {
  if (!sentryEnabled) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
