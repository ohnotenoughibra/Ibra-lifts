export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    // Match all routes except static assets, sw.js, and manifest
    '/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|og-image\\.png|manifest\\.json|sw\\.js|offline\\.html).*)',
  ],
};
