import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLen: process.env.AUTH_SECRET?.length ?? 0,
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    googleIdPrefix: process.env.GOOGLE_CLIENT_ID?.slice(0, 10) ?? '',
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    authUrl: process.env.AUTH_URL ?? 'NOT_SET',
    nextauthUrl: process.env.NEXTAUTH_URL ?? 'NOT_SET',
    vercelEnv: process.env.VERCEL_ENV ?? 'NOT_SET',
  });
}
