// Service Worker for Arvind Sweets PWA/TWA
// Bump this when changing caching behavior to force clients to refresh old caches.
const CACHE_NAME = 'arvind-sweets-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls - always network
  if (url.pathname.startsWith('/api') || url.origin.includes('render.com')) {
    return;
  }

  // Skip Chrome extension and other schemes
  if (!url.protocol.startsWith('http')) return;

  // For SPA navigations (HTML), prefer network and DO NOT cache per-route HTML.
  // Caching HTML aggressively can cause clients to get a stale shell (e.g., missing viewport)
  // and show a desktop-like layout until a refresh.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          // Fall back to the cached app shell (ignoring query params) or offline page.
          const cachedShell = await caches.match('/', { ignoreSearch: true });
          if (cachedShell) return cachedShell;

          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        })
    );
    return;
  }

  // For static assets: network first, fallback to cache, and cache successful responses.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request, { ignoreSearch: true });
        if (cachedResponse) return cachedResponse;

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Arvind Sweets',
      body: event.data.text(),
    };
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    // Use tag so Android/Chrome can group notifications, and allow re-alerting on repeat.
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    // We can't force a custom sound for Web Push; this requests the default sound.
    silent: false,
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Arvind Sweets', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus any existing client and navigate it.
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            client.navigate(urlToOpen);
          } catch {}
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

async function syncOfflineOrders() {
  // This would sync any orders made while offline
  // Implementation depends on your IndexedDB setup
  console.log('[SW] Syncing offline orders...');
}
