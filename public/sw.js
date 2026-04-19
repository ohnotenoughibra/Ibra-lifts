const CACHE_NAME = 'roots-gains-v2.0.0-33e6b3a-1776088892';

// App shell files to cache on install
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/apple-touch-icon.png',
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch: network-first for pages/API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // API routes: network-first, queue POST/PUT for offline replay
  if (url.pathname.startsWith('/api/')) {
    // NEVER cache /api/sync — must always return fresh data from Postgres
    if (url.pathname.startsWith('/api/sync')) {
      return; // Let it pass through to network without SW interception
    }
    if (request.method === 'GET') {
      // Cache other GET API responses for offline reads
      event.respondWith(
        fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => caches.match(request).then((cached) =>
            cached || new Response(JSON.stringify({ error: 'offline' }), {
              status: 503, headers: { 'Content-Type': 'application/json' }
            })
          ))
      );
    }
    // Non-GET API requests pass through to network (POST/PUT handled by sync queue)
    return;
  }

  // For navigation requests (HTML pages): network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline — serve from cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets (_next/static, images, etc.): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── Background Sync ──
// Queue sync requests when offline, replay when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-store') {
    event.waitUntil(replaySyncQueue());
  }
});

async function replaySyncQueue() {
  try {
    const cache = await caches.open('roots-gains-sync-queue');
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;

      const body = await response.json();
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        await cache.delete(request);
      } catch {
        // Still offline or server error — leave in queue, try remaining entries
        continue;
      }
    }
  } catch {
    // Cache API or network error — retry on next sync event
  }
}

// ── Push Notifications ──
// Handles server-sent push events via Web Push API (VAPID)
// Payload shape: { title, body, tag, url, category }
self.addEventListener('push', (event) => {
  let data = { title: 'Roots Gains', body: 'Time to train!', tag: 'default', url: '/', category: '' };

  if (event.data) {
    try {
      const raw = event.data.json();
      // Only allow expected fields with length limits — prevent payload injection
      data.title = typeof raw.title === 'string' ? raw.title.substring(0, 100) : data.title;
      data.body = typeof raw.body === 'string' ? raw.body.substring(0, 200) : data.body;
      data.tag = typeof raw.tag === 'string' ? raw.tag.substring(0, 50) : data.tag;
      data.url = typeof raw.url === 'string' ? raw.url.substring(0, 200) : data.url;
      data.category = typeof raw.category === 'string' ? raw.category.substring(0, 50) : data.category;
    } catch {
      data.body = event.data.text();
    }
  }

  // Category-specific icons could be added here in the future
  const tagToAction = {
    'streak-reminder': { action: 'train', label: 'Start Training' },
    'training-reminder': { action: 'train', label: 'Start Training' },
    'pr-celebration': { action: 'open', label: 'View PR' },
    'recovery-alert': { action: 'open', label: 'View Recovery' },
    'nutrition-nudge': { action: 'open', label: 'Log Meal' },
  };

  const customAction = tagToAction[data.tag];

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    vibrate: [100, 50, 100],
    renotify: true,
    data: {
      url: data.url || '/',
      category: data.category || '',
    },
    actions: [
      customAction
        ? { action: customAction.action, title: customAction.label }
        : { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks — route to the correct page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Validate URL is same-origin to prevent open redirect attacks
  let urlToOpen = '/';
  try {
    const raw = event.notification.data?.url || '/';
    const parsed = new URL(raw, self.location.origin);
    if (parsed.origin === self.location.origin) {
      urlToOpen = parsed.pathname + parsed.search;
    }
  } catch { /* invalid URL, use default */ }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if available and navigate it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/' && !client.url.endsWith(urlToOpen)) {
            client.navigate(urlToOpen);
          }
          return client;
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ── Service Worker Update Detection ──
// Notify clients when a new version is available
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Respond to version check
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
