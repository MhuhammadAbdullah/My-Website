/* Service worker: installable app + offline fallback.
   - Pages: network first; the last good copy (and /offline) is used when there is no connection.
   - Static files and images: cached after the first load.
   - Never touches API calls, other origins' POSTs, or signed-in influencer pages. */
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_PAGES = 30;
const MAX_IMAGES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, STATIC, IMAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/influencer/") || url.pathname.startsWith("/_next/data/"))) return;

  // Page navigations
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && sameOrigin) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy).then(() => trim(PAGES, MAX_PAGES)));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Built assets (hashed file names, safe to keep forever)
  if (sameOrigin && (url.pathname.startsWith("/_next/static/") || /\.(?:woff2?|ttf|otf)$/.test(url.pathname))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Images (own optimiser + Cloudinary): show the cached one at once, refresh in the background
  if ((sameOrigin && url.pathname.startsWith("/_next/image")) || url.hostname === "res.cloudinary.com" || req.destination === "image") {
    event.respondWith(
      caches.open(IMAGES).then((cache) =>
        cache.match(req).then((hit) => {
          const refresh = fetch(req)
            .then((res) => {
              if (res.ok || res.type === "opaque") cache.put(req, res.clone()).then(() => trim(IMAGES, MAX_IMAGES));
              return res;
            })
            .catch(() => hit);
          return hit || refresh;
        }),
      ),
    );
  }
});
