const CACHE_NAME = 'hrn-cache-1.0.5';
const RUNTIME_CACHE = 'hrn-runtime-cache-1.0.5';
const SHELL_ASSETS = ['./', './index.html', './assets/logic.js', './assets/manifest.json', './assets/branding/favicon/favicon-black.png', './assets/branding/favicon/favicon-white.png', './assets/branding/app/icon-192x192-maskable.png', './assets/branding/app/icon-512x512-maskable.png', './assets/avatars/1.webp', './assets/avatars/2.webp', './assets/avatars/3.webp', './assets/avatars/4.webp', './assets/avatars/5.webp'];
self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
		await cache.addAll(SHELL_ASSETS);
	}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
	event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => {
		if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
			return caches.delete(key);
		}
	}))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
	const {
		request
	} = event;
	const url = new URL(request.url);
	if (url.origin.includes('supabase.co')) {
		event.respondWith(fetch(request));
		return;
	}
	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).then((response) => {
			const copy = response.clone();
			caches.open(CACHE_NAME).then((cache) => {
				cache.put('./index.html', copy);
			});
			return response;
		}).catch(() => caches.match('./index.html')));
		return;
	}
	if (SHELL_ASSETS.includes(url.pathname) || SHELL_ASSETS.includes('./' + url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => {
			return cached || fetch(request);
		}));
		return;
	}
	if (request.method === 'GET') {
		event.respondWith(caches.match(request).then((cached) => {
			const fetchPromise = fetch(request).then((networkResponse) => {
				if (networkResponse && networkResponse.status === 200) {
					caches.open(RUNTIME_CACHE).then((cache) => {
						cache.put(request, networkResponse.clone());
					});
				}
				return networkResponse;
			}).catch(() => cached);
			return cached || fetchPromise;
		}));
	}
});
