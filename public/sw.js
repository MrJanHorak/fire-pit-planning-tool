const CACHE_NAME = 'firepit-offline-v3';
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/flame-favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/robots.txt',
  '/sitemap.xml',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key.startsWith('firepit-offline-') && key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve(true);
          }),
        ),
      ),
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (
    requestUrl.pathname.startsWith('/src/') ||
    requestUrl.pathname.startsWith('/@vite/') ||
    requestUrl.pathname.startsWith('/node_modules/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put('/index.html', response.clone());
            } catch {
              // A full or unavailable cache must not hide a successful page load.
            }
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedShell = await cache.match('/index.html');
          return cachedShell || Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') {
        try {
          await cache.put(event.request, response.clone());
        } catch {
          // Continue serving the network response if browser storage is unavailable.
        }
      }
      return response;
    }),
  );
});
