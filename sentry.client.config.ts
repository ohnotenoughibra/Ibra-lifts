import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session replay — capture 1% of sessions, 100% on error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'Load failed',
    'NetworkError',
    'AbortError',
    'ChunkLoadError',
  ],

  // Don't send PII
  sendDefaultPii: false,

  // Strip query strings before anything leaves the browser. Some internal
  // requests (e.g. /api/sync?userId=...) carry an identifier in the URL that
  // would otherwise land in performance traces and breadcrumbs.
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data && typeof breadcrumb.data.url === 'string') {
      breadcrumb.data.url = stripQuery(breadcrumb.data.url);
    }
    return breadcrumb;
  },
  beforeSendTransaction(event) {
    if (typeof event.transaction === 'string') {
      event.transaction = stripQuery(event.transaction);
    }
    if (event.request && typeof event.request.url === 'string') {
      event.request.url = stripQuery(event.request.url);
    }
    return event;
  },

  // Tag the release
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.1.0',
  environment: process.env.NODE_ENV,
});

// Drop everything after '?' — query params are never needed for grouping and
// are the only place an identifier slips into a URL in this app.
function stripQuery(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}
