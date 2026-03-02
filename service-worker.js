const CACHE_NAME = "hrn-cache-v1.0.6";

// Dynamisch root pad bepalen
const ORIGIN = self.location.origin;
const PATHNAME = self.location.pathname;

// Voor GitHub project pages is pathname meestal "/repo/service-worker.js"
// Dus we halen de mapnaam eruit
let BASE_PATH = PATHNAME.replace(/\/service-worker\.js$/, "");

// Als het root is, wordt BASE_PATH ""
if (BASE_PATH === "/") BASE_PATH = "";

const FILES_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/assets/logic.js`,
  `${BASE_PATH}/assets/branding/logo.png`
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Navigatie verzoek (pagina's)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(`${BASE_PATH}/index.html`);
      })
    );
    return;
  }

  // Assets
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});
