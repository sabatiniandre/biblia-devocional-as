const CACHE_NAME = 'arai-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating new version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Only handle GET requests
  if (event.request.method !== 'GET') {
    console.log('[SW] Ignored POST/Non-GET:', url.pathname);
    return;
  }

  // 2. Never intercept API, Auth, or Internal paths
  if (
    url.pathname.includes('/api/') || 
    url.pathname.includes('/auth/') || 
    url.pathname.includes('/metrics/') ||
    url.pathname.includes('sw.js') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com')
  ) {
    console.log('[SW] Ignored API Request:', url.pathname);
    return;
  }

  // 3. Strategy: Network First, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If valid response, clone it and put it in cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('[SW] Cache HIT:', url.pathname);
            return cachedResponse;
          }
          
          console.log('[SW] Cache MISS & Network Fail:', url.pathname);
          
          // Only return offline page for actual navigation
          if (event.request.mode === 'navigate') {
             return caches.match('/');
          }
          
          return null;
        });
      })
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});