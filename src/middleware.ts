import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';

// Use the edge-safe auth config (no @vercel/postgres, bcryptjs, or uuid).
// The full auth config with Credentials provider is in auth.ts and is only
// used by API routes / server components (Node.js runtime).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Match all routes except static assets, sw.js, and manifest
    '/((?!_next/static|_next/image|favicon.*\\.png|icon-.*\\.png|apple-touch-icon\\.png|og-image\\.png|manifest\\.json|sw\\.js|offline\\.html).*)',
  ],
};
