import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { ensureAuthTables } from './db-init';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        try {
          await ensureAuthTables();

          const { rows } = await sql`
            SELECT id, name, email, password_hash FROM auth_users WHERE email = ${email}
          `;

          if (rows.length === 0) {
            console.log('[auth] No user found for email:', email);
            return null;
          }

          const user = rows[0];
          const passwordMatch = await bcrypt.compare(password, user.password_hash);
          if (!passwordMatch) {
            console.log('[auth] Password mismatch for:', email);
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        } catch (error) {
          console.error('[auth] Authorize error:', error);
          return null;
        }
      },
    }),
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
    // Redirect unauthenticated users to login
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

      // Redirect away from auth pages if already logged in
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
  // NEXTAUTH_SECRET env var is used automatically for JWT signing
  trustHost: true,
});
