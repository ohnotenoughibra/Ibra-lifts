'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // New version deployed while open → its code files are gone: reload once
    const m = `${error?.name ?? ''} ${error?.message ?? ''}`;
    if (/ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(m)) {
      try {
        const last = Number(sessionStorage.getItem('reloaded-for-new-version') || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem('reloaded-for-new-version', String(Date.now()));
          window.location.reload();
          return;
        }
      } catch { /* fall through */ }
    }
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0a0f1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '24rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              An unexpected error occurred. Your workout data is safe in local storage.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
              {`${error?.name ?? 'Error'}: ${error?.message ?? ''}`}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                backgroundColor: '#6366f1',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
