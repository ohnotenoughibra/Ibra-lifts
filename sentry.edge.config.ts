import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.1.0',
  environment: process.env.NODE_ENV,
});
