const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  // Enable PWA support
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
    {
      source: '/_next/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/:path(icon-.*\\.png|favicon\\.ico|manifest\\.json|og-image\\.png)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=604800',
        },
      ],
    },
    {
      // Service worker must never be cached — browser needs to see changes on each deploy
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
        },
      ],
    },
  ],
};

module.exports = withSentryConfig(nextConfig, {
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (CI/CD)
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Hide source maps from end users
  hideSourceMaps: true,
  // Automatically tree-shake Sentry logger in production
  disableLogger: true,
});
