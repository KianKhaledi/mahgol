'use strict';

const scope = self.registration.scope;
const cachePrefix = 'mahgol-pwa:' + scope + ':';
const cacheName = cachePrefix + 'v2';
const entry = new URL('index.html', scope).href;
// Build-time SHA-256 digests keep one release's cached files together.
const integrity = {
  "index.html": "sha256-pL0SrbFbMm4clWPAYUGeUO9iEANMn607wq1468DNRiI=",
  "style.css": "sha256-bla3XU0rxa908BGKH1o/kKRKmMqjkFjrh5Zl/mo+UUQ=",
  "app.js": "sha256-POD41hVG9QwtyDi1sKsEAYl7QKy0M/WAFT0lQFFQLL4=",
  "cycle.js": "sha256-jfIZUXpuTeo1+K9UGj3xr95KDgFljUYlX+oPGf5r09o=",
  "vault.js": "sha256-iGYRq09KRxsIsZIufwyzgYK8dpOBaR83eNdAbMvTQ5s=",
  "install.js": "sha256-QuAima749IxWJii/9Bp3jbdx2FUKRJRmBaQH0aQ1a9c=",
  "manifest.webmanifest": "sha256-O7MiOkfLZpGn4+OWihaf79K16MdCsAHffbgsmK5Eh7M=",
  "apple-touch-icon.png": "sha256-PWzr0Q/gqHy7f2F8dFUtPyoPTaBptW6W+0egWnIEPP4=",
  "icon-192.png": "sha256-d1VVNgocV+OBUgasM1G0nXAgkwkTzZd4vXNamwqJjtE=",
  "icon-512.png": "sha256-gqaMrRaOtIvllK+fKnxop/FKmZCG4UZhxVY1tTh9QZU=",
  "icon-maskable.png": "sha256-NAvQ5sXvWsV+pfmih0x+xNw0GE4rPbSP/x+TxecVNd0=",
  "crown.svg": "sha256-WACQAJ+so0p9xM4t38sJiKZyShileBCF03L94M4zcYk=",
  "moon.svg": "sha256-k2hynzkNZkINRe0wciAiurKXCcPnCqjTmtDhxQozOe4=",
  "care.svg": "sha256-8y/lLfskZ/Jj4Tm2j3EZy9H5v/yztbae5MSTJf6njCs=",
  "yoga.svg": "sha256-8vOzD3SwqWHviaow/j5sK1qWSloIRhFpOKd6ipleoKU=",
  "fa-Bold.woff": "sha256-8SYqYF1Z4duTgCa+SAUPuKpxfVRlyTggNn2IJ+L/I9s=",
  "fa-Regular.woff": "sha256-xcXg0SumSUwxtU9HCDVFAbIItCly1hB2Uif+3q2ABdI="
};
const urls = new Set(Object.keys(integrity).map(path => new URL(path, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const requests = Object.entries(integrity).map(([path, hash]) =>
      new Request(new URL(path, scope).href, { cache: 'reload', integrity: hash }));
    await cache.addAll(requests);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
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
  const cached = await cache.match(key);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Assets are precached atomically. Recovery fetches do not mutate the release.
    return response;
  } catch {
    return new Response('ماه‌گل هنوز برای استفادهٔ آفلاین آماده نشده. یک‌بار با اینترنت بازش کن.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.hash = '';
  url.search = '';
  const route = url.href;
  const home = event.request.mode === 'navigate' && (route === scope || route === entry);
  if (home || urls.has(route)) event.respondWith(serve(event.request, home ? entry : route));
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
