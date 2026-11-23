/* میزکار — سرویس‌ورکر برای کار آفلاین */
const CACHE = "mizkar-v1";
const SCOPE = self.registration.scope;

async function precache() {
  const cache = await caches.open(CACHE);
  const extras = ["manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
  try {
    const res = await fetch(SCOPE, { cache: "no-cache" });
    if (res.ok) {
      await cache.put(SCOPE, res.clone());
      const html = await res.text();
      for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (!/^(https?:|data:|blob:|#)/.test(m[1])) extras.push(m[1]);
      }
    }
  } catch (_) {
    /* offline during install; runtime caching will fill in later */
  }
  await Promise.all(
    extras.map((u) => cache.add(new URL(u, SCOPE).href).catch(() => undefined))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "cache" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.all(data.urls.map((u) => cache.add(u).catch(() => undefined)))
      )
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // صفحهٔ اصلی: اول شبکه، در نبود اینترنت از حافظه
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          }
          return res;
        })
        .catch(() => caches.match(SCOPE).then((hit) => hit || Response.error()))
    );
    return;
  }

  // سایر فایل‌ها: اول حافظه و به‌روزرسانی در پس‌زمینه
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    })
  );
});
