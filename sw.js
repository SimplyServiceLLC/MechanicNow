const CACHE_NAME = 'mechanicnow-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Network first, fall back to cache strategy
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});