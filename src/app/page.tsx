'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const isOnboarded = useAppStore((state) => state.isOnboarded);

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
