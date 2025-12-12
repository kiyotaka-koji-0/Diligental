// Service Worker for Diligental PWA
const CACHE_NAME = 'diligental-cache-v1';
const RUNTIME_CACHE = 'diligental-runtime-v1';
const ASSETS_CACHE = 'diligental-assets-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/client',
  '/login',
  '/register',
  '/offline',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching essential assets');
      return cache.addAll(PRECACHE_ASSETS).catch((error) => {
        console.warn('Service Worker: Some assets failed to cache:', error);
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== ASSETS_CACHE
          ) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network-first strategy for most requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket and other non-HTTP(S) protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy: Network-first for API calls, Cache-first for assets
  if (url.pathname.startsWith('/api')) {
    // Network-first for API calls
    event.respondWith(networkFirst(request));
  } else if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  ) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
  } else {
    // Network-first for HTML pages
    event.respondWith(networkFirst(request));
  }
});

// Network-first strategy: Try network, fall back to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses for later use
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Neither network nor cache available
    if (request.destination === 'document') {
      return caches.match('/offline');
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Cache-first strategy: Try cache first, fall back to network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return from cache but update in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(ASSETS_CACHE).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Ignore network errors in background
    });
    
    return cachedResponse;
  }

  // Not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(ASSETS_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('Offline - Asset not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Handle messages from clients (for cache management, etc.)
self.addEventListener('message', (event) => {
  const { type } = event.data;

  if (type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }

  if (type === 'CACHE_URLS') {
    const { urls } = event.data;
    caches.open(RUNTIME_CACHE).then((cache) => {
      urls.forEach((url) => {
        cache.add(url).catch(() => {
          console.warn('Failed to cache:', url);
        });
      });
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Background sync for message delivery (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // This would sync pending messages with the server
      Promise.resolve()
    );
  }
});

console.log('Service Worker loaded and ready');
