'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useDbSync } from '@/lib/useDbSync';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const isOnboarded = useAppStore((state) => state.isOnboarded);

  // Sync Zustand store with Vercel Postgres for persistent cloud backup
  useDbSync();

  useEffect(() => {
    // Simulate initial load / hydration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isOnboarded) {
    return <Onboarding />;
  }

  return <Dashboard />;
}
