// ===========================================
// Web Entry Point
// ===========================================

import './lib/sentry.js';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { useAuthStore } from './stores/auth.store.js';
import { setSentryUser } from './lib/sentry.js';

// Sync auth state → Sentry user context
useAuthStore.subscribe((state) => {
  setSentryUser(state.user ? { id: state.user.id, email: state.user.email } : null);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
