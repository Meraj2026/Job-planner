import icon192 from "../assets/icon-192.png?inline";
import icon512 from "../assets/icon-512.png?inline";

export const appIcon = icon192;

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export const canPromptInstall = () => deferred !== null;

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function subscribeInstall(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function promptInstall() {
  if (!deferred) return false;
  const ev = deferred;
  await ev.prompt();
  const choice = await ev.userChoice;
  deferred = null;
  notify();
  return choice.outcome === "accepted";
}

function link(rel: string, href: string, attrs: Record<string, string> = {}) {
  const el = document.createElement("link");
  el.rel = rel;
  el.href = href;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.head.appendChild(el);
}

/** اگر فایل مانیفست روی سرور نبود، مانیفست درون‌برنامه‌ای ساخته می‌شود تا نصب همچنان ممکن باشد. */
function inlineManifest() {
  const base = new URL("./", location.href).href;
  const manifest = {
    name: "میزکار — دبیرخانه، کارپردازی و نامه‌رسانی",
    short_name: "میزکار",
    lang: "fa",
    dir: "rtl",
    id: base,
    start_url: base,
    scope: base,
    display: "standalone",
    background_color: "#F4F3EE",
    theme_color: "#2D4B9A",
    icons: [
      { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  link("manifest", URL.createObjectURL(blob));
}

export function setupPwa() {
  link("icon", icon192, { type: "image/png" });
  link("apple-touch-icon", icon192);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });

  if (!/^https?:$/.test(location.protocol)) return;

  fetch("./manifest.webmanifest", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no manifest"))))
    .then((m) => {
      if (!m || !Array.isArray(m.icons)) throw new Error("bad manifest");
      link("manifest", "./manifest.webmanifest");
    })
    .catch(inlineManifest);

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          const urls = performance
            .getEntriesByType("resource")
            .map((e) => e.name)
            .filter((u) => u.startsWith(location.origin));
          reg.active?.postMessage({ type: "cache", urls });
        })
        .catch(() => {
          /* سرویس‌ورکر در دسترس نیست؛ برنامه بدون حالت آفلاین کار می‌کند */
        });
    });
  }
}
