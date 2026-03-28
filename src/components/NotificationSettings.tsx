'use client';
import { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Bell, BellOff, Zap, Flame, Trophy, Heart, Utensils, Clock } from 'lucide-react';
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/push-subscription';
import { requestNotificationPermission } from '@/lib/notifications';
import { useToast } from './Toast';

interface NotificationToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({ icon, label, description, enabled, onChange, disabled }: NotificationToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : enabled
            ? 'bg-orange-500/10 border border-orange-500/30'
            : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600/50'
      }`}
    >
      <div className={`p-2 rounded-lg ${enabled ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-700/50 text-zinc-500'}`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-zinc-100">{label}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
      <div
        className={`w-10 h-6 rounded-full transition-colors relative ${
          enabled ? 'bg-orange-500' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </div>
    </button>
  );
}

export default function NotificationSettings() {
  const notificationPreferences = useAppStore((s) => s.notificationPreferences);
  const setNotificationPreferences = useAppStore((s) => s.setNotificationPreferences);

  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const pushSupported = typeof window !== 'undefined' && isPushSupported();
  const pushActive = notificationPreferences.pushEnabled && !!notificationPreferences.pushSubscription;

  // ── Toggle Push Notifications ────────────────────────────────────────────
  const handlePushToggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (pushActive) {
        // Unsubscribe
        const success = await unsubscribeFromPush();
        if (success) {
          setNotificationPreferences({
            pushEnabled: false,
            pushSubscription: null,
          });
          showToast('Push notifications disabled', 'success');
        } else {
          showToast('Failed to disable push notifications', 'error');
        }
      } else {
        // Request permission first
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
          showToast('Notification permission denied. Check your browser settings.', 'error');
          setLoading(false);
          return;
        }

        // Subscribe
        const subscriptionData = await subscribeToPush();
        if (subscriptionData) {
          setNotificationPreferences({
            enabled: true,
            pushEnabled: true,
            pushSubscription: subscriptionData,
          });
          showToast('Push notifications enabled!', 'success');
        } else {
          showToast('Failed to enable push notifications. Try again.', 'error');
        }
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, pushActive, setNotificationPreferences, showToast]);

  // ── Toggle Individual Notification Types ─────────────────────────────────
  const toggleCategory = useCallback(
    (key: string, value: boolean) => {
      setNotificationPreferences({ [key]: value });
    },
    [setNotificationPreferences]
  );

  // ── Time Preference ──────────────────────────────────────────────────────
  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNotificationPreferences({ reminderTime: e.target.value });
    },
    [setNotificationPreferences]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-orange-400" />
        <h3 className="text-base font-semibold text-zinc-100">Notifications</h3>
      </div>

      {/* Push Toggle */}
      <div className="space-y-2">
        <button
          onClick={handlePushToggle}
          disabled={loading || !pushSupported}
          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
            !pushSupported
              ? 'opacity-40 cursor-not-allowed bg-zinc-800/50 border border-zinc-700/50'
              : pushActive
                ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/40'
                : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-orange-500/30'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${pushActive ? 'bg-orange-500/20' : 'bg-zinc-700/50'}`}>
            {pushActive ? (
              <Bell className="w-5 h-5 text-orange-400" />
            ) : (
              <BellOff className="w-5 h-5 text-zinc-500" />
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-zinc-100">
              {loading ? 'Setting up...' : pushActive ? 'Push Notifications On' : 'Enable Push Notifications'}
            </div>
            <div className="text-xs text-zinc-500">
              {!pushSupported
                ? 'Not supported in this browser'
                : pushActive
                  ? 'Receiving reminders even when the app is closed'
                  : 'Get training reminders, streak alerts, and more'}
            </div>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
          )}
        </button>
      </div>

      {/* Notification Categories */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-1">
          Notification Types
        </div>

        <NotificationToggle
          icon={<Zap className="w-4 h-4" />}
          label="Workout Reminders"
          description="Daily training reminders at your preferred time"
          enabled={notificationPreferences.trainingReminders}
          onChange={(v) => toggleCategory('trainingReminders', v)}
          disabled={!notificationPreferences.enabled && !pushActive}
        />

        <NotificationToggle
          icon={<Flame className="w-4 h-4" />}
          label="Streak Warnings"
          description="Alert when your training streak is at risk"
          enabled={notificationPreferences.streakAlerts}
          onChange={(v) => toggleCategory('streakAlerts', v)}
          disabled={!notificationPreferences.enabled && !pushActive}
        />

        <NotificationToggle
          icon={<Trophy className="w-4 h-4" />}
          label="PR Celebrations"
          description="Celebrate when you hit a new personal record"
          enabled={notificationPreferences.prCelebrations}
          onChange={(v) => toggleCategory('prCelebrations', v)}
          disabled={!notificationPreferences.enabled && !pushActive}
        />

        <NotificationToggle
          icon={<Heart className="w-4 h-4" />}
          label="Recovery Alerts"
          description="Rest day suggestions and recovery reminders"
          enabled={notificationPreferences.recoveryAlerts}
          onChange={(v) => toggleCategory('recoveryAlerts', v)}
          disabled={!notificationPreferences.enabled && !pushActive}
        />

        <NotificationToggle
          icon={<Utensils className="w-4 h-4" />}
          label="Nutrition Nudges"
          description="Meal timing, hydration, and macro reminders"
          enabled={notificationPreferences.nutritionNudges}
          onChange={(v) => toggleCategory('nutritionNudges', v)}
          disabled={!notificationPreferences.enabled && !pushActive}
        />
      </div>

      {/* Reminder Time */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-1">
          Daily Reminder Time
        </div>
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            !notificationPreferences.enabled && !pushActive
              ? 'opacity-40 bg-zinc-800/50 border-zinc-700/50'
              : 'bg-zinc-800/50 border-zinc-700/50'
          }`}
        >
          <div className="p-2 rounded-lg bg-zinc-700/50 text-zinc-400">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-100">Reminder Time</div>
            <div className="text-xs text-zinc-500">When to send your daily training reminder</div>
          </div>
          <input
            type="time"
            value={notificationPreferences.reminderTime}
            onChange={handleTimeChange}
            disabled={!notificationPreferences.enabled && !pushActive}
            className="bg-zinc-700/50 text-zinc-100 text-sm rounded-lg px-3 py-1.5 border border-zinc-600/50 focus:border-orange-500/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      </div>

    </div>
  );
}
