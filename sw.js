const CACHE_NAME = 'shipper-saigon-voxel-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/audio.js',
  './js/voxels.js',
  './js/scene.js',
  './js/traffic.js',
  './js/main.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(ASSETS); }));
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (res) {
      return res || fetch(e.request);
    })
  );
});
