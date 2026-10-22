/* 粤桥 Yue Bridge · offline support. Network first (updates show right away), saved copy when offline. */
const CACHE = 'yb-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.add('./')).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return;          // translation requests go straight to Google
  if (url.pathname.endsWith('/sw.js')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (font) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }
    const page = req.mode === 'navigate';
    const key = page ? new Request(url.origin + url.pathname) : req;
    const net = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
    const saved = await cache.match(key, { ignoreSearch: true });
    if (!saved) return net;
    // slow or no connection: open the saved copy after 3.5 s, the fresh one is stored for next time
    return Promise.race([net.catch(() => saved), new Promise(r => setTimeout(() => r(saved), 3500))]);
  })());
});
