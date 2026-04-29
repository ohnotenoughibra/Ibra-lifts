'use client';

import { SessionProvider } from 'next-auth/react';
import { useVisualViewport } from '@/hooks/useVisualViewport';

function ViewportTracker() {
  useVisualViewport();
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ViewportTracker />
      {children}
    </SessionProvider>
  );
}
