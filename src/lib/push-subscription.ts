// ── Web Push Subscription Management ──────────────────────────────────────────
// Client-side helpers to subscribe/unsubscribe from push notifications
// via the service worker and Web Push API.

import type { PushSubscriptionData } from './types';

/**
 * Convert a VAPID public key from base64 URL-safe to Uint8Array
 * (required by pushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current push subscription from the service worker, if any.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Subscribe to push notifications.
 *
 * 1. Requests notification permission
 * 2. Subscribes via the service worker's PushManager
 * 3. Sends the subscription to our API for verification
 * 4. Returns the subscription data to store in the user's preferences
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('[push] Push notifications not supported in this browser');
    return null;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[push] Notification permission denied');
    return null;
  }

  // Get VAPID public key — prefer env var, fall back to API
  let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    try {
      const res = await fetch('/api/push');
      if (!res.ok) throw new Error('Failed to fetch VAPID key');
      const data = await res.json();
      vapidPublicKey = data.publicKey;
    } catch (err) {
      console.error('[push] Cannot get VAPID public key:', err);
      return null;
    }
  }

  if (!vapidPublicKey) {
    console.error('[push] No VAPID public key available');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription first
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }

    // Extract the serializable subscription data
    const subscriptionJSON = subscription.toJSON();
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscriptionJSON.keys?.p256dh || '',
        auth: subscriptionJSON.keys?.auth || '',
      },
    };

    // Verify subscription with our server (also sends a test notification)
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: subscriptionData,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[push] Server rejected subscription:', error);
      // If subscription is expired, unsubscribe locally
      if (res.status === 410) {
        await subscription.unsubscribe();
      }
      return null;
    }

    return subscriptionData;
  } catch (err) {
    console.error('[push] Subscription failed:', err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications.
 * Removes the subscription from the browser's PushManager.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const subscription = await getCurrentSubscription();
    if (!subscription) return true; // Already unsubscribed

    const success = await subscription.unsubscribe();
    return success;
  } catch (err) {
    console.error('[push] Unsubscribe failed:', err);
    return false;
  }
}

/**
 * Send a push notification via our API.
 * Used for server-triggered notifications (e.g., from cron jobs or nudge engine).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: {
    title: string;
    body: string;
    tag?: string;
    url?: string;
    category?: string;
  }
): Promise<boolean> {
  try {
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        subscription,
        payload,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      if (data.expired) {
        console.warn('[push] Subscription expired — user needs to re-subscribe');
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('[push] Send failed:', err);
    return false;
  }
}
