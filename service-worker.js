const CACHE_NAME = 'hrn-cache-1.0.5-4';
const RUNTIME_CACHE = 'hrn-runtime-cache-1.0.5-4';

const SHELL_ASSETS = [
  './',
  './index.html',
  './assets/logic.js',
  './assets/manifest.json',
  './assets/branding/favicon/favicon-black.png',
  './assets/branding/favicon/favicon-white.png',
  './assets/branding/app/icon-192x192-maskable.png',
  './assets/branding/app/icon-512x512-maskable.png',
  './assets/avatars/1.webp',
  './assets/avatars/2.webp',
  './assets/avatars/3.webp',
  './assets/avatars/4.webp',
  './assets/avatars/5.webp'
];

const IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.avif'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('./index.html', response.clone());
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (
    SHELL_ASSETS.includes(url.pathname) ||
    SHELL_ASSETS.includes('./' + url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  const isImage = IMAGE_EXTENSIONS.some((ext) =>
    url.pathname.toLowerCase().endsWith(ext)
  );

  if (isImage) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;

        try {
          const response = await fetch(request);

          if (response && response.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
          }

          return response;
        } catch {
          return cached;
        }
      })
    );
    return;
  }

  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        try {
          const networkResponse = await fetch(request);

          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
          }

          return networkResponse;
        } catch {
          return cached;
        }
      })
    );
  }
});
