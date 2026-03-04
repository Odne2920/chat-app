const CACHE_NAME = 'hrn-chat-cache-v2.0.7';
const RUNTIME_CACHE = 'hrn-runtime-v8';

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

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await Promise.all(SHELL_ASSETS.map(async (url) => {
                try {
                    const response = await fetch(url, { cache: 'no-store' });
                    if (response.ok) await cache.put(url, response.clone());
                } catch {}
            }));
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME && key !== RUNTIME_CACHE) return caches.delete(key);
            }))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Alleen GET requests en alleen bestanden uit shell assets of runtime
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;

                return fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((c) => c.put(request, responseClone));
                    }
                    return response;
                }).catch(() => new Response(null, { status: 503 }));
            })
        );
    }
});
