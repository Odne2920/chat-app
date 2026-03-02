const CACHE_NAME = "hrn-cache-v1.0.1000";

const BASE_PATH = ""; // root van username.github.io

const FILES_TO_CACHE = [
  "/",
  "/index.html?v=6",
  "/assets/logic.js?v=6",
  "/assets/branding/logo.png?v=6",
  // Icons
  "/assets/branding/app/icon-192x192-maskable.png?v=6",
  "/assets/branding/app/icon-192x192-not-maskable.png?v=6",
  "/assets/branding/app/icon-256x256-maskable.png?v=6",
  "/assets/branding/app/icon-256x256-not-maskable.png?v=6",
  "/assets/branding/app/icon-512x512-maskable.png?v=6",
  "/assets/branding/app/icon-512x512-not-maskable.png?v=6"
];

// Install: cache only FILES_TO_CACHE
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

// Fetch: cache-first only for pre-cached files, otherwise network only
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Navigatie → fallback index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html?v=6"))
    );
    return;
  }

  // Alleen FILES_TO_CACHE gebruiken voor cache, geen dynamisch toevoegen
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});
