import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
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
      const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                         request.nextUrl.pathname.startsWith('/register') ||
                         request.nextUrl.pathname.startsWith('/reset-password');
      const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');
      const isPublicAsset = request.nextUrl.pathname.startsWith('/_next') ||
                            request.nextUrl.pathname.includes('.');

      // Allow public routes
      if (isAuthPage || isApiAuth || isPublicAsset) return true;

      // Redirect to login if not authenticated
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
