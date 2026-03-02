const CACHE_NAME = "hrn-cache-v1.1.0";

const BASE_PATH = ""; // root van username.github.io

const FILES_TO_CACHE = [
  "/",
  "/index.html?v=8",
  "/assets/logic.js?v=8",
  "/assets/branding/logo.png?v=8",
  // Icons
  "/assets/branding/app/icon-512x512-not-maskable.png?v=8",
  "/assets/branding/app/icon-512x512-maskable.png?v=8",
  "/assets/branding/app/icon-256x256-not-maskable.png?v=8",
  "/assets/branding/app/icon-256x256-maskable.png?v=8",
  "/assets/branding/app/icon-192x192-not-maskable.png?v=8",
  "/assets/branding/app/icon-192x192-maskable.png?v=8"
];

// Install SW
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

// Activate SW
self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.mode === "navigate") {
    // Offline fallback naar index.html
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html?v=8"))
    );
    return;
  }

  // Cache-first voor andere assets
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
            return caches.match("/assets/branding/logo.png?v=8");
          }
        });
    })
  );
});
