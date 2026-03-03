const CACHE_NAME = "hrn-cache-v1.0.01011";
const FILES_TO_CACHE = [
  "./index.html?v=15",
  "./assets/logic.js?v=15",
  "./assets/branding/app/icon-192x192-maskable.png?v=15",
  "./assets/branding/app/icon-192x192-not-maskable.png?v=15",
  "./assets/branding/app/icon-256x256-maskable.png?v=15",
  "./assets/branding/app/icon-256x256-not-maskable.png?v=15",
  "./assets/branding/app/icon-512x512-maskable.png?v=15",
  "./assets/branding/app/icon-512x512-not-maskable.png?v=15",
  "./assets/avatars/1.webp?v=15",
  "./assets/avatars/2.webp?v=15",
  "./assets/avatars/3.webp?v=15",
  "./assets/avatars/4.webp?v=15",
  "./assets/avatars/5.webp?v=15",
];
self.addEventListener("install",(e=>{self.skipWaiting(),e.waitUntil(caches.open(CACHE_NAME).then((e=>e.addAll(FILES_TO_CACHE).catch((()=>{})))))})),self.addEventListener("activate",(e=>{self.clients.claim(),e.waitUntil(caches.keys().then((e=>Promise.all(e.map((e=>e!==CACHE_NAME&&caches.delete(e)))))))})),self.addEventListener("fetch",(e=>{const t=e.request;"navigate"!==t.mode?e.respondWith(caches.match(t).then((e=>e||fetch(t)))):e.respondWith(fetch(t).catch((()=>caches.match("./index.html?v=15"))))}));
