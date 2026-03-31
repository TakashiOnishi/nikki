const CACHE = 'journal-v1';
const ASSETS = [
  '/prog.github.io/journal/',
  '/prog.github.io/journal/index.html',
  '/prog.github.io/journal/style.css',
  '/prog.github.io/journal/app.js',
  '/prog.github.io/journal/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// キャッシュ優先・なければネットワーク
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
