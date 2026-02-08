import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring — sample 10% of server transactions
  tracesSampleRate: 0.1,

  // Don't send PII
  sendDefaultPii: false,

  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.1.0',
  environment: process.env.NODE_ENV,
});
