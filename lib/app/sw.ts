/**
 * The app's service worker, written per restaurant. It keeps the app's
 * home, menu, hours and More pages for offline reading and shows an
 * offline page for anything else. It never caches a POST, a booking, an
 * order, a gift card page, the API, or any URL carrying a token or a
 * preview flag: those must always come fresh from the server.
 */
export function serviceWorkerSource(base: string, version: string): string {
  const cache = `pass-app:${base}:`;
  return `/* The Pass: app service worker for ${base} */
const BASE = ${JSON.stringify(base)};
const PREFIX = ${JSON.stringify(cache)};
const CACHE = PREFIX + ${JSON.stringify(version)};
const OFFLINE = BASE + "/app/offline";
const SHELL = [BASE + "/app", BASE + "/app/menu", BASE + "/app/visit", BASE + "/app/more", OFFLINE];
const KEEP = new Set(SHELL);
const NEVER = [/\\/booking\\//, /\\/order(\\/|$)/, /\\/reserve(\\/|$)/, /\\/gift-cards(\\/|$)/, /^\\/api\\//, /\\/rewards(\\/|$)/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { credentials: "same-origin" })).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function offline() {
  return (await caches.match(OFFLINE)) || new Response("<h1>You're offline</h1>", { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never a POST, or anything that changes something
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Build assets are content-hashed: keep them, so the app's look works offline.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (!url.pathname.startsWith(BASE + "/")) return;

  const navigate = req.mode === "navigate";
  const sensitive = url.search !== "" || NEVER.some((r) => r.test(url.pathname.slice(BASE.length) || "/") || r.test(url.pathname));
  const keep = navigate && !sensitive && KEEP.has(url.pathname);

  if (keep) {
    // Fresh when online (and kept for later); the kept copy when not.
    event.respondWith(fetch(req).then((res) => {
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, copy)); }
      return res;
    }).catch(async () => (await caches.match(url.pathname)) || offline()));
    return;
  }
  if (navigate) event.respondWith(fetch(req).catch(() => offline()));
});
`;
}
