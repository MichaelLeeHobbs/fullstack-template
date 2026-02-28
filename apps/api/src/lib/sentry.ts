// ===========================================
// Sentry Error Tracking
// ===========================================
// Optional — only active when SENTRY_DSN is set.

import * as Sentry from '@sentry/node';
import { config } from '../config/index.js';

export const sentryEnabled = !!config.SENTRY_DSN;

if (sentryEnabled) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    release: 'api@0.0.1',
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    beforeSend(event) {
      // Strip sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      return event;
    },
  });
}

export { Sentry };
