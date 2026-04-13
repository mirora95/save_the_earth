const CACHE_NAME = 'save-the-earth-v1';
const APP_BASE_PATH = new URL('./', self.registration.scope).pathname;

// Keep the app shell small and predictable for GitHub Pages deployments.
const CORE_ASSETS = [
  APP_BASE_PATH,
  `${APP_BASE_PATH}index.html`,
  `${APP_BASE_PATH}src/main.js`,
  `${APP_BASE_PATH}src/styles.css`,
  `${APP_BASE_PATH}manifest.json`,
  `${APP_BASE_PATH}icons/icon-192.png`,
  `${APP_BASE_PATH}icons/icon-512.png`,
  `${APP_BASE_PATH}icons/apple-touch-icon.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(event.request)) ||
            (await caches.match(`${APP_BASE_PATH}index.html`)) ||
            (await caches.match(APP_BASE_PATH))
          );
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });
    }),
  );
});
