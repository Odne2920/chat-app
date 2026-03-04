const CACHE_NAME = 'hrn-chat-cache-v2.0.1';
const RUNTIME_CACHE = 'hrn-runtime-v2';

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
            for (const url of SHELL_ASSETS) {
                try {
                    const response = await fetch(url, { cache: 'no-store' });
                    if (response.ok) await cache.put(url, response.clone());
                } catch (err) {
                    console.warn('Failed to cache:', url, err);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
                    }
                    return response;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    const isImage = request.destination === 'image';
    const isProxyImage = url.href.includes('/api/CORSproxy.js');

    if (isImage || isProxyImage) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then((cache) =>
                cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    return fetch(request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                cache.put(request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            if (isImage) return caches.match('./assets/avatars/1.webp');
                            return new Response(JSON.stringify({ error: "Offline" }), { 
                                headers: { 'Content-Type': 'application/json' } 
                            });
                        });
                })
            )
        );
        return;
    }

    const isCDN = url.origin !== location.origin;
    if (isCDN && (url.href.includes('fonts') || url.href.includes('css') || url.href.includes('jsdelivr'))) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then((cache) =>
                cache.match(request).then((cachedResponse) => {
                    const fetchPromise = fetch(request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                cache.put(request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch(() => cachedResponse);
                    return cachedResponse || fetchPromise;
                })
            )
        );
        return;
    }

    if (url.href.includes('supabase.co')) {
        if (url.protocol === 'wss:') return;
        event.respondWith(
            fetch(request).catch(() => new Response(JSON.stringify({ message: "Offline" }), {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "application/json" }
            }))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            return cachedResponse || fetch(request).then((response) => {
                if (response && response.status === 200) {
                     caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
                }
                return response;
            });
        })
    );
});
