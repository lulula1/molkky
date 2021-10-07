const CACHE_NAME = 'molkky-v2';
const CACHE_ALLOWLIST = [CACHE_NAME];
const URLS_TO_CACHE = [
  '/lang/en.js',
  '/lang/fr.js',
  /*'/',
  '/index.html',
  '/css/common.css',
  '/css/ending_panel.css',
  '/css/game_panel.css',
  '/css/lobby_panel.css',
  '/js/angular.js',
  '/js/app.js',
  '/js/dragdrop.js',
  '/js/game.js',
  '/font/freehand.ttf',
  '/font/freschezza-regular.tff',
  '/font/heroic.tff',
  '/font/oneday.tff',*/
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
    // .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key =>
          !CACHE_ALLOWLIST.includes(key)
          && caches.delete(key)
        )
      )
    )
      .then(self.clients.claim())
  );
  // event.waitUntil(self.clients.claim());
});

// Returns cached files but fetch and updates them in background
// From: https://developers.google.com/web/fundamentals/primers/service-workers/high-performance-loading
self.addEventListener('fetch', event => {
  event.respondWith(async function () {
    const normalizedUrl = new URL(event.request.url);
    normalizedUrl.search = '';

    const fetchResponseP = fetch(normalizedUrl);
    const fetchResponseCloneP = fetchResponseP.then(r => r.clone());

    event.waitUntil(async function () {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(normalizedUrl, await fetchResponseCloneP);
    }());

    return (await caches.match(normalizedUrl)) || fetchResponseP;
  }());
});
