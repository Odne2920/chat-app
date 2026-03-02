const CACHE_NAME = "hrn-cache-v1.0.11";

const BASE_PATH = ""; // root van username.github.io

const FILES_TO_CACHE = [
  "/",
  "/index.html?v=7",
  "/assets/logic.js?v=7",
  "/assets/branding/logo.png?v=7",
  // Icons
  "/assets/branding/app/icon-192x192-maskable.png?v=7",
  "/assets/branding/app/icon-192x192-not-maskable.png?v=7",
  "/assets/branding/app/icon-256x256-maskable.png?v=7",
  "/assets/branding/app/icon-256x256-not-maskable.png?v=7",
  "/assets/branding/app/icon-512x512-maskable.png?v=7",
  "/assets/branding/app/icon-512x512-not-maskable.png?v=7"
];

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

// Activate
self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Navigatie → fallback index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html?v=7"))
    );
    return;
  }

  // Cache-first voor andere assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Dynamisch cachen
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // fallback image voor offline icons/logo
          if (request.destination === "image") {
            return caches.match("/assets/branding/logo.png?v=7");
          }
        });
    })
  );
});
