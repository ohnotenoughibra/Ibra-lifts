'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { useDbSync } from '@/lib/useDbSync';
import { flushSyncQueue } from '@/lib/db-sync';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import LoadingScreen from '@/components/LoadingScreen';
import { Download, Bell, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status: sessionStatus } = useSession();
  const authUserId = session?.user?.id;
  const isOnboarded = useAppStore((state) => state.isOnboarded);
  const setOnline = useAppStore((state) => state.setOnline);
  const setAuthUserId = useAppStore((state) => state.setAuthUserId);

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Notification permission
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // SW update available
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

  // Sync Zustand store with Vercel Postgres — keyed to authenticated user
  useDbSync(authUserId);

  // When auth session is available, ensure the store user ID matches
  useEffect(() => {
    if (authUserId) {
      setAuthUserId(authUserId);
    }
  }, [authUserId, setAuthUserId]);

  // Wait for Zustand store to rehydrate from localStorage AND auth session to resolve
  // This prevents the onboarding flash on returning users
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      // Store is rehydrated — now check if session is also ready
      if (sessionStatus !== 'loading') {
        setIsLoading(false);
      }
    });

    // If store already hydrated before this effect ran
    if (useAppStore.persist.hasHydrated() && sessionStatus !== 'loading') {
      setIsLoading(false);
    }

    return unsub;
  }, [sessionStatus]);

  // Offline / online detection
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      flushSyncQueue();
    };
    const handleOffline = () => setOnline(false);

    setOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker for offline PWA support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW installed, waiting to activate — show update banner
                setSwUpdateAvailable(true);
                setWaitingSW(newWorker);
              }
            });
          }
        });
      }).catch(() => {
        // SW registration failed — app still works, just no offline cache
      });

      // Listen for controller change (new SW took over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New SW is active — reload to use latest assets
        window.location.reload();
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // PWA Install Prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show install banner if user hasn't dismissed it
      const dismissed = localStorage.getItem('roots-install-dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Notification permission check
  useEffect(() => {
    if (!('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    setNotifPermission(Notification.permission);
    // Show notification prompt after onboarding, if not yet asked
    if (Notification.permission === 'default') {
      const asked = localStorage.getItem('roots-notif-asked');
      if (!asked && isOnboarded) {
        // Delay showing notification banner
        const timer = setTimeout(() => setShowNotifBanner(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnboarded]);

  // Note: isLoading is managed by the hydration+session effect above

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);
    if (outcome === 'dismissed') {
      localStorage.setItem('roots-install-dismissed', '1');
    }
  }, [deferredPrompt]);

  const handleDismissInstall = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem('roots-install-dismissed', '1');
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    setShowNotifBanner(false);
    localStorage.setItem('roots-notif-asked', '1');

    if (permission === 'granted') {
      // Schedule a local streak reminder notification
      scheduleStreakReminder();
    }
  }, []);

  const handleDismissNotif = useCallback(() => {
    setShowNotifBanner(false);
    localStorage.setItem('roots-notif-asked', '1');
  }, []);

  const handleSWUpdate = useCallback(() => {
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
    }
    setSwUpdateAvailable(false);
  }, [waitingSW]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isOnboarded) {
    return <Onboarding authUserId={authUserId} />;
  }

  return (
    <>
      <Dashboard />

      {/* PWA Banners */}
      <AnimatePresence>
        {/* Install Banner */}
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-4 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm">Install Roots Gains</h3>
                <p className="text-xs text-white/80 mt-0.5">Add to your home screen for offline access and a native app experience.</p>
              </div>
              <button onClick={handleDismissInstall} className="p-1 text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-white text-primary-600 font-medium text-sm py-2 rounded-xl hover:bg-white/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismissInstall}
                className="px-4 py-2 text-white/70 text-sm hover:text-white transition-colors"
              >
                Not now
              </button>
            </div>
          </motion.div>
        )}

        {/* Notification Permission Banner */}
        {showNotifBanner && notifPermission === 'default' && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-grappler-800 border border-grappler-700 rounded-2xl p-4 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-grappler-100 text-sm">Streak Reminders</h3>
                <p className="text-xs text-grappler-400 mt-0.5">Get notified to keep your training streak alive. We only send helpful reminders.</p>
              </div>
              <button onClick={handleDismissNotif} className="p-1 text-grappler-500 hover:text-grappler-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnableNotifications}
                className="flex-1 bg-orange-500 text-white font-medium text-sm py-2 rounded-xl hover:bg-orange-400 transition-colors"
              >
                Enable Reminders
              </button>
              <button
                onClick={handleDismissNotif}
                className="px-4 py-2 text-grappler-500 text-sm hover:text-grappler-300 transition-colors"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}

        {/* SW Update Banner */}
        {swUpdateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-primary-600 px-4 py-3 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-white flex-shrink-0" />
              <p className="text-sm text-white flex-1">A new version is available.</p>
              <button
                onClick={handleSWUpdate}
                className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-lg hover:bg-white/30 transition-colors"
              >
                Update
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Schedule smart training notifications */
function scheduleStreakReminder() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Check if we should show a weekly planning reminder (Sunday evening)
  const now = new Date();
  const isSunday = now.getDay() === 0;
  const isEvening = now.getHours() >= 18 && now.getHours() <= 21;
  const shownToday = localStorage.getItem('roots-weekly-notif-date') === now.toDateString();

  if (isSunday && isEvening && !shownToday) {
    const store = useAppStore.getState();
    const user = store.user;
    if (user?.trainingDays && user.trainingDays.length > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const liftDays = user.trainingDays.map(d => dayNames[d]).join(', ');
      const combatHardDays = (user.combatTrainingDays || [])
        .filter(d => d.intensity === 'hard')
        .map(d => dayNames[d.day]);

      let body = `You have ${user.trainingDays.length} lifting sessions this week (${liftDays}).`;
      if (combatHardDays.length > 0) {
        body += ` Hard sport training: ${combatHardDays.join(', ')} — plan recovery around it.`;
      }

      new Notification('Plan Your Week', {
        body,
        icon: '/icon-192x192.png',
        tag: 'weekly-plan',
      });
      localStorage.setItem('roots-weekly-notif-date', now.toDateString());
    }
  }

  // Schedule a check every 4 hours for training day reminders
  const checkInterval = 4 * 60 * 60 * 1000;
  const lastCheck = localStorage.getItem('roots-daily-notif-ts');
  if (!lastCheck || Date.now() - parseInt(lastCheck) > checkInterval) {
    const store = useAppStore.getState();
    const user = store.user;
    if (user?.trainingDays?.includes(now.getDay()) && now.getHours() >= 8 && now.getHours() <= 10) {
      // Morning of a training day
      const hasTrainedToday = store.workoutLogs.some(
        log => new Date(log.date).toDateString() === now.toDateString()
      );
      if (!hasTrainedToday) {
        const latestWhoop = store.latestWhoopData;
        let body = 'Lifting day! Open Roots Gains to start your session.';
        if (latestWhoop?.recoveryScore != null && latestWhoop.recoveryScore < 50) {
          body = `Recovery is ${latestWhoop.recoveryScore}% — consider a lighter session today.`;
        }
        new Notification('Training Day', {
          body,
          icon: '/icon-192x192.png',
          tag: 'daily-train',
        });
      }
    }
    localStorage.setItem('roots-daily-notif-ts', String(Date.now()));
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[notifications] Smart training notifications active');
  }
}
