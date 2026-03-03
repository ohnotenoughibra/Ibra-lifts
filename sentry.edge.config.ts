import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  beforeSend(event) {
    // Redact sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },

  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.1.0',
  environment: process.env.NODE_ENV,
});
