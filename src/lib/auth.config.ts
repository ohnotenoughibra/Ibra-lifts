import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';

/**
 * Edge-safe auth configuration.
 *
 * This file contains ONLY providers and callbacks that can run in the
 * Edge runtime (no Node.js-only imports like @vercel/postgres or bcryptjs).
 * It is used by middleware.ts directly.
 *
 * The full auth config (with Credentials provider + database) lives in
 * auth.ts and extends this config for use in API routes / server components.
 */
export default {
  providers: [
    Google,
    // Apple Sign In (requires APPLE_CLIENT_ID and APPLE_CLIENT_SECRET env vars)
    ...(process.env.APPLE_CLIENT_ID ? [Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    })] : []),
    // NOTE: Credentials provider is added in auth.ts (Node.js only)
    // because it requires @vercel/postgres + bcryptjs which aren't
    // available in the Edge runtime.
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname.startsWith('/login') ||
                         pathname.startsWith('/register') ||
                         pathname.startsWith('/reset-password') ||
                         pathname.startsWith('/verify-email');
      const isApi = pathname.startsWith('/api');
      const isPublicAsset = pathname.startsWith('/_next') ||
                            pathname.includes('.');

      // Allow public routes, API routes, and assets
      if (isAuthPage || isApi || isPublicAsset) return true;

      // Allow the main app page and debug/recovery pages without auth —
      // the app works in guest mode using localStorage (Zustand persist).
      // Auth is optional and enables cloud sync via Vercel Postgres when signed in.
      if (pathname === '/' || pathname.startsWith('/debug')) return true;

      // Other routes still require auth
      if (!isLoggedIn) return false;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
