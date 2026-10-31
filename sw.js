/* Offline cache for Lock-In Diary. Bump CACHE when you change any file so installed copies update. */
var CACHE = 'lockin-diary-v2';
var ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'icons.js', 'manifest.webmanifest',
  'icons/favicon-64.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'fonts/cormorant-garamond-latin-500-italic.woff2', 'fonts/cormorant-garamond-latin-600-italic.woff2', 'fonts/cormorant-garamond-latin-600-normal.woff2',
  'fonts/pixelify-sans-latin-400-normal.woff2', 'fonts/pixelify-sans-latin-600-normal.woff2',
  'fonts/nunito-latin-400-normal.woff2', 'fonts/nunito-latin-600-normal.woff2', 'fonts/nunito-latin-700-normal.woff2'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit || caches.match('index.html'); });
    return hit || net;
  }));
});
