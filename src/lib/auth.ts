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
          // Handle magic link sign-in
          if (password.startsWith('__magic__ml_')) {
            const mlToken = password.replace('__magic__', '');
            // Check if this token was recently validated (marked used within last 2 minutes)
            const { rows: mlRows } = await sql`
              SELECT prt.user_id, au.id, au.name, au.email
              FROM password_reset_tokens prt
              JOIN auth_users au ON au.id = prt.user_id
              WHERE prt.token = ${mlToken}
                AND prt.used = TRUE
                AND au.email = ${email}
                AND prt.expires_at > NOW() - INTERVAL '2 minutes'
            `;
            if (mlRows.length > 0) {
              console.log(`[auth] Magic link sign-in successful: ${email}`);
              return { id: mlRows[0].id, name: mlRows[0].name, email: mlRows[0].email };
            }
            console.log('[auth] Magic link sign-in failed: invalid or expired token');
            return null;
          }

          const { rows } = await sql`
            SELECT id, name, email, password_hash, failed_login_count, locked_until
            FROM auth_users WHERE email = ${email}
          `;

          if (rows.length === 0) {
            console.log('[auth] Authentication failed: user not found');
            return null;
          }

          const user = rows[0];

          // Check account lockout
          if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remainingMs = new Date(user.locked_until).getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            console.log(`[auth] Account locked for ${remainingMin} more minutes: ${email}`);
            return null;
          }

          // Google-only users can't sign in with credentials
          if (!user.password_hash) {
            console.log('[auth] Authentication failed: account uses Google sign-in');
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.password_hash);
          if (!passwordMatch) {
            // Increment failed attempts and potentially lock
            const failCount = (user.failed_login_count || 0) + 1;
            let lockUntil: string | null = null;

            if (failCount >= 15) {
              lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
            } else if (failCount >= 10) {
              lockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
            } else if (failCount >= 5) {
              lockUntil = new Date(Date.now() + 1 * 60 * 1000).toISOString(); // 1 min
            }

            await sql`
              UPDATE auth_users
              SET failed_login_count = ${failCount}, locked_until = ${lockUntil}
              WHERE id = ${user.id}
            `;

            console.log(`[auth] Authentication failed: invalid credentials (attempt ${failCount})`);
            return null;
          }

          // Success — reset failed attempts
          if (user.failed_login_count > 0) {
            await sql`
              UPDATE auth_users SET failed_login_count = 0, locked_until = NULL WHERE id = ${user.id}
            `;
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
      // For OAuth sign-in (Google/Apple), auto-create or link user
      if ((account?.provider === 'google' || account?.provider === 'apple') && user.email) {
        const email = user.email.toLowerCase().trim();

        // Look up or create user — retry up to 3 times for Postgres cold starts
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { rows } = await sql`
              SELECT id FROM auth_users WHERE email = ${email}
            `;

            if (rows.length === 0) {
              // New OAuth user — create account
              const userId = uuidv4();
              const provider = account?.provider || 'google';
              await sql`
                INSERT INTO auth_users (id, name, email, password_hash, auth_provider, email_verified)
                VALUES (${userId}, ${user.name || 'Athlete'}, ${email}, ${null}, ${provider}, TRUE)
              `;
              user.id = userId;
            } else {
              user.id = rows[0].id;
            }
            // Success — break out of retry loop
            break;
          } catch (error: any) {
            // If tables don't exist, create them and retry immediately
            if (error?.message?.includes('does not exist') && attempt === 0) {
              try {
                await ensureAuthTables();
                continue; // retry without backoff
              } catch {
                // Fall through to normal retry
              }
            }
            console.error(`[auth] OAuth sign-in DB error (attempt ${attempt + 1}/3):`, error);
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
            if (attempt >= 2) {
              console.error(`[auth] OAuth sign-in failed after 3 attempts — blocking sign-in for ${user.email}`);
              return false;
            }
          }
        }
      }
      return true;
    },
  },
});
