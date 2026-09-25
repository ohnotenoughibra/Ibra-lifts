'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

/** A new version was deployed while this page was open: its code files are gone. */
function isStaleChunk(error: Error): boolean {
  const m = `${error?.name ?? ''} ${error?.message ?? ''}`;
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(m);
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const stale = isStaleChunk(error);

  useEffect(() => {
    if (stale) {
      // Reload once to pick up the new version; a guard stops a reload loop.
      try {
        const key = 'reloaded-for-new-version';
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch { /* storage blocked — fall through to the screen */ }
    }
    Sentry.captureException(error);
  }, [error, stale]);

  const details = `${error?.name ?? 'Error'}: ${error?.message ?? ''}${error?.digest ? `\ndigest: ${error.digest}` : ''}\n${(error?.stack ?? '').split('\n').slice(0, 6).join('\n')}`;

  return (
    <div className="min-h-screen bg-grappler-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-lg bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-grappler-50 mb-2">{stale ? 'App updated' : 'Something went wrong'}</h2>
        <p className="text-sm text-grappler-400 mb-4">
          {stale
            ? 'A new version was installed while this page was open. Reload to continue.'
            : 'An unexpected error occurred. Your workout data is safe in local storage.'}
        </p>
        {!stale && (
          <pre className="text-left text-[11px] leading-snug text-grappler-400 bg-grappler-950 border border-grappler-800 rounded-lg p-3 mb-4 max-h-40 overflow-auto whitespace-pre-wrap break-words" data-testid="error-details">
            {`${error?.name ?? 'Error'}: ${error?.message ?? ''}`}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => (stale ? window.location.reload() : reset())}
            className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
          >
            {stale ? 'Reload' : 'Try again'}
          </button>
          {!stale && (
            <button
              onClick={() => { navigator.clipboard?.writeText(details).then(() => setCopied(true)).catch(() => {}); }}
              className="px-4 py-3 rounded-xl bg-grappler-800 text-grappler-200 font-semibold text-sm hover:bg-grappler-700 transition-colors"
            >
              {copied ? 'Copied' : 'Copy details'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
