const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Build ID for version polling (detects new deploys)
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(),
    // Dynamically set AUTH_URL per Vercel deployment so that NextAuth sends
    // Google the correct OAuth callback URL.  Without this, preview deploys
    // inherit the production AUTH_URL and redirect users to production after
    // Google sign-in.
    //
    // Priority:
    //   Production  → NEXT_PUBLIC_APP_URL (custom domain) or VERCEL_URL
    //   Preview     → VERCEL_URL (unique per deploy)
    //   Local       → left unset (NextAuth falls back to localhost)
    ...(process.env.VERCEL_URL
      ? {
          AUTH_URL:
            process.env.VERCEL_ENV === 'production' &&
            process.env.NEXT_PUBLIC_APP_URL
              ? process.env.NEXT_PUBLIC_APP_URL
              : `https://${process.env.VERCEL_URL}`,
        }
      : {}),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
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
        {
          key: 'Content-Security-Policy',
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://*.paypal.com https://*.sentry.io https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com https://*.paypal.com; font-src 'self' data:; connect-src 'self' https://*.paypal.com https://*.sentry.io https://va.vercel-scripts.com https://api.whoop.com https://api-7.whoop.com; frame-src 'self' https://www.paypal.com https://*.paypal.com; worker-src 'self'; manifest-src 'self'; media-src 'self'",
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
      source: '/:path(icon-.*\\.png|favicon.*\\.png|apple-touch-icon\\.png|manifest\\.json|og-image\\.png)',
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
});
