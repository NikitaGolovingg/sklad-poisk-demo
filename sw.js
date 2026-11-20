const cacheName = 'warehouse-screen-02-3';
const previousCacheName = 'warehouse-screen-02-2';
const resources = ['index.html', 'style.css', 'app.js', 'plan.png', 'catalog.json', 'nopriz.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // An already prepared phone keeps its previous worker if the upgrade fails.
    const previous = await caches.match('ready', {cacheName: previousCacheName});
    if (previous) {
      const cache = await caches.open(cacheName);
      await cache.addAll(resources.map(path => new Request(new URL(path, self.registration.scope), {cache: 'reload'})));
      const catalog = await (await cache.match('catalog.json')).json();
      if (catalog.cases.length !== 1) throw new Error('Incomplete catalog');
      await cache.put('ready', new Response('yes'));
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    if (await cache.match('ready')) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await cache.match('index.html');
        if (shell) return shell;
      }
    }
    return fetch(request);
  })());
});
