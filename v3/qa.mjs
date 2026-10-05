/**
 * Mock QA: prove a hosted mock holds up at every screen size.
 *
 *   npm run qa [--shots]
 *
 * Serves public/ locally, then at each width reports horizontal
 * overflow (with the element that causes it) and, with --shots, saves
 * one screenshot per section to .qa/.
 *
 * Fixed pixel heights on photo bands were the bug this catches: a crop
 * that frames correctly at 1440 can cut faces at 2560, so every width
 * gets looked at before anything ships.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "/orravan-v2";
const shots = process.argv.includes("--shots");
const WIDTHS = [2560, 1920, 1440, 1366, 1024, 768, 390];
const ROOT = new URL("../public", import.meta.url).pathname;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml", ".mp4": "video/mp4", ".json": "application/json",
  ".txt": "text/plain", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path.endsWith("/")) path += "index.html";
  // The export writes a sub-route as `team.html`, and Netlify serves it
  // at `/team`. Resolve the same way, or QA checks a 404.
  else if (!extname(path)) path += ".html";
  try {
    const body = await readFile(join(ROOT, normalize(path)));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
await new Promise((r) => server.listen(0, r));
const origin = `http://localhost:${server.address().port}`;
/** Every route the mock serves. A sub-page can overflow where the
    homepage does not — the timeline positions nodes absolutely. */
const ROUTES = ["/", "/team"];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let failures = 0;

for (const route of ROUTES) {
  const url = `${origin}${base}${route}`;
  console.log(`\n${route}`);
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflow = [];
    // Only worth naming when the page actually scrolls: parallax layers
    // are deliberately oversized inside clipping parents.
    const scrolls = document.documentElement.scrollWidth > vw;
    for (const el of scrolls ? document.querySelectorAll("body *") : []) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > vw + 1 || r.left < -1)) {
        const cls = typeof el.className === "string" ? el.className : "";
        overflow.push(`${el.tagName}.${cls.slice(0, 60)}`);
      }
    }
    return {
      scrolls,
      overflow: overflow.slice(0, 4),
      sections: document.querySelectorAll("main > section").length,
    };
  });

  const ok = !report.scrolls;
  if (!ok) failures++;
  console.log(
    `${String(width).padStart(4)}  ${ok ? "no h-scroll" : "H-SCROLL"}  ${report.sections} sections` +
      (report.overflow.length ? `\n      overflowing: ${report.overflow.join(", ")}` : ""),
  );

  if (shots) {
    const rails = await page.$$eval("main > section", (els) =>
      els.map((el) => el.dataset.rail),
    );
    for (const n of rails) {
      await page.evaluate((sel) => {
        const el = document.querySelector(`[data-rail="${sel}"]`);
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80);
      }, n);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `.qa/${width}-s${n}.png` });
    }
  }
  await page.close();
}
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} width(s) with horizontal scroll` : "\nclean at every width");
process.exit(failures ? 1 : 0);
