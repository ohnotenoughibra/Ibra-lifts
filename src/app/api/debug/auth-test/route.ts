import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { auth } = await import('@/lib/auth');
    const session = await auth();
    return NextResponse.json({
      ok: true,
      hasSession: !!session,
      userId: session?.user?.id ?? null
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({
      ok: false,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
