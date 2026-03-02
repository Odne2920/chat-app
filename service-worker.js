const CACHE_NAME = "hrn-cache-v1.0.7";

const BASE_PATH = self.location.pathname.replace(/\/service-worker\.js$/, "");

const FILES_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html?v=3`,
  `${BASE_PATH}/assets/logic.js?v=3`,
  `${BASE_PATH}/assets/branding/logo.png?v=3`,
  `${BASE_PATH}/assets/branding/app/icon-192x192.png?v=3`,
  `${BASE_PATH}/assets/branding/app/icon-256x256.png?v=3`,
  `${BASE_PATH}/assets/branding/app/icon-512x512.png?v=3`
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${BASE_PATH}/index.html?v=3`))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          if (request.destination === "image") {
            return caches.match(`${BASE_PATH}/assets/branding/logo.png?v=3`);
          }
        });
    })
  );
});
