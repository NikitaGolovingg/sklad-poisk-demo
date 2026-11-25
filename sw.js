importScripts('package-config.js?release=7');
const {cacheName, resources, validCatalog} = warehousePackage;
const scope = self.registration.scope;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // An already prepared phone keeps its previous worker if the upgrade fails.
    const names = await caches.keys();
    const previous = (await Promise.all(names.filter(name => name === 'warehouse-map-03'
      || (name.startsWith('warehouse-document-package-shell-') && name !== cacheName))
      .map(name => caches.match(new URL('ready', scope), {cacheName:name})))).some(Boolean);
    if (previous) {
      const cache = await caches.open(cacheName);
      await Promise.all(resources.map(async path => {
        const url = new URL(path, scope);
        url.searchParams.set('release', cacheName);
        const response = await fetch(url, {cache:'no-store'});
        if (!response.ok) throw new Error('Incomplete download: ' + path);
        await cache.put(new URL(path, scope), response);
      }));
      const catalog = await (await cache.match('catalog.json')).json();
      if (!validCatalog(catalog)) throw new Error('Incomplete catalog');
      await cache.put('ready', new Response('yes'));
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.clients.claim();
  const windows = await self.clients.matchAll({type:'window'});
  for (const tab of windows) {
    if (tab.url.startsWith(scope) && new URL(tab.url).searchParams.has('refresh-map'))
      void tab.navigate(scope).catch(() => {});
  }
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  if (request.mode !== 'navigate' && request.cache === 'no-store') return;
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
