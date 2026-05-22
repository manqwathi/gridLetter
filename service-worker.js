const CACHE_NAME = 'grid-letter-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'style.css',
  'game.js',
  'dynamic-board.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Install Event: Save all core assets directly into local storage cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA Engine: Securing structural game cache assets.');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clear out older structural file caches automatically on reload updates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Serve cached versions of files instantly if internet is disconnected
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
