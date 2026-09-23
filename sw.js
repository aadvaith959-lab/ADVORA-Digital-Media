// Advora service worker — makes the site installable and opens instantly.
// Bump CACHE whenever you upload a new index.html so phones pick up the update.
const CACHE = 'advora-v23';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  // add files one by one so a single missing icon can't stop the whole worker from installing
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // Google Apps Script API, fonts, QR lib: always live from the network

  if (req.mode === 'navigate') {                          // page: show the saved copy at once, refresh it in the background
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return c.match('index.html').then(function (hit) {
          const net = fetch(req).then(function (res) {
            if (res && res.ok) c.put('index.html', res.clone());
            return res;
          });
          if (hit) { net.catch(function () {}); return hit; }   // instant open; the fresh copy is used on the next visit
          return net;
        });
      })
    );
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
