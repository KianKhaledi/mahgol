'use strict';

const scope = self.registration.scope;
const cachePrefix = 'mahgol-pwa:' + scope + ':';
const cacheName = cachePrefix + 'v1';
const files = [
  'index.html', 'style.css', 'app.js', 'cycle.js', 'vault.js', 'install.js',
  'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'icon-maskable.png', 'crown.svg', 'moon.svg', 'care.svg', 'yoga.svg',
  'fa-Bold.woff', 'fa-Regular.woff'
];
const urls = new Set(files.map(path => new URL(path, scope).href));
const entry = new URL('index.html', scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...urls].map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function serve(request, key) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      try { await cache.put(key, response.clone()); } catch { /* Storage can be full. */ }
      return response;
    }
    return await cache.match(key) || response;
  } catch {
    return await cache.match(key) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.hash = '';
  url.search = '';
  const route = url.href;
  const home = request.mode === 'navigate' && (route === scope || route === entry);
  if (home || urls.has(route)) event.respondWith(serve(request, home ? entry : route));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => {
      const url = new URL(client.url);
      return url.origin + url.pathname === scope || url.origin + url.pathname === entry;
    });
    if (existing) return existing.focus();
    return self.clients.openWindow(new URL('./#reminders', scope).href);
  })());
});
