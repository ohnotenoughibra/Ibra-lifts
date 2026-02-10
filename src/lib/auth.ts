import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ensureAuthTables } from './db-init';
import authConfig from './auth.config';

/**
 * Full auth configuration — extends the edge-safe config with the
 * Credentials provider (requires Node.js runtime for @vercel/postgres
 * and bcryptjs).
 *
 * Used by API routes and server components. Middleware uses auth.config.ts
 * directly so it stays Edge-compatible.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
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
            console.log('[auth] Authentication failed: user not found');
            return null;
          }

          const user = rows[0];

          // Google-only users can't sign in with credentials
          if (!user.password_hash) {
            console.log('[auth] Authentication failed: account uses Google sign-in');
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.password_hash);
          if (!passwordMatch) {
            console.log('[auth] Authentication failed: invalid credentials');
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
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // For Google sign-in, auto-create or link user in our auth_users table
      if (account?.provider === 'google' && user.email) {
        const email = user.email.toLowerCase().trim();

        // Retry DB operations up to 2 times (handles Vercel Postgres cold starts)
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await ensureAuthTables();

            const { rows } = await sql`
              SELECT id FROM auth_users WHERE email = ${email}
            `;

            if (rows.length === 0) {
              // New Google user — create account
              const userId = uuidv4();
              await sql`
                INSERT INTO auth_users (id, name, email, password_hash, auth_provider)
                VALUES (${userId}, ${user.name || 'Athlete'}, ${email}, ${null}, 'google')
              `;
              user.id = userId;
            } else {
              user.id = rows[0].id;
            }
            // Success — break out of retry loop
            break;
          } catch (error) {
            console.error(`[auth] Google sign-in DB error (attempt ${attempt + 1}):`, error);
            if (attempt === 0) {
              // Wait briefly before retry (DB cold start)
              await new Promise(r => setTimeout(r, 1000));
            }
            // On final failure, still allow sign-in — user gets Google's profile ID
            // and DB user will be created on next successful sign-in
          }
        }
      }
      return true;
    },
  },
});
