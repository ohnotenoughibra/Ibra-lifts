'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useDbSync } from '@/lib/useDbSync';
import { flushSyncQueue } from '@/lib/db-sync';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const isOnboarded = useAppStore((state) => state.isOnboarded);
  const setOnline = useAppStore((state) => state.setOnline);

  // Sync Zustand store with Vercel Postgres for persistent cloud backup
  useDbSync();

  // Offline / online detection
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Flush any queued syncs when we come back online
      flushSyncQueue();
    };
    const handleOffline = () => setOnline(false);

    // Set initial state
    setOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker for offline PWA support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — app still works, just no offline cache
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

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
