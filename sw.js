/* 离线缓存：让加到主屏幕后的 App 断网也能打开 */
const CACHE = 'checkin-v3'
const ASSETS = [
  './',
  './index.html',
  './src/styles.css',
  './src/main.js',
  './src/dom.js',
  './src/lib/date.js',
  './src/lib/color.js',
  './src/lib/stats.js',
  './src/lib/store.js',
  './src/lib/encourage.js',
  './src/views/today.js',
  './src/views/stats.js',
  './src/views/editor.js',
  './src/views/settings.js',
  './icon.svg',
  './apple-touch-icon.png',
  './manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
