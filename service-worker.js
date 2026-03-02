const CACHE_NAME = "hrn-cache-v1.0.1001";

const BASE_PATH = "";

const FILES_TO_CACHE = [
  "/",
  "/index.html?v=7",
  "/assets/logic.js?v=7",
  "/assets/branding/logo.png?v=7",
  "/assets/branding/app/icon-192x192-maskable.png?v=7",
  "/assets/branding/app/icon-192x192-not-maskable.png?v=7",
  "/assets/branding/app/icon-256x256-maskable.png?v=7",
  "/assets/branding/app/icon-256x256-not-maskable.png?v=7",
  "/assets/branding/app/icon-512x512-maskable.png?v=7",
  "/assets/branding/app/icon-512x512-not-maskable.png?v=7"
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
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html?v=7"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});
