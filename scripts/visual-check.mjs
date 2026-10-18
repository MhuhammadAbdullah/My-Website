// Visual + accessibility smoke check for the dark ("noir") theme.
//
//   node scripts/visual-check.mjs            # web on :3000, admin on :3001
//
// For each page and each viewport width it saves a full-page screenshot to
// .screenshots/ (git-ignored) and reports: horizontal overflow, console errors,
// and text that fails WCAG AA contrast (4.5:1 normal text, 3:1 large text).
// Playwright is a root devDependency only -- it is never part of an app bundle.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const ADMIN = process.env.ADMIN_URL ?? "http://localhost:3001";
const WIDTHS = [360, 768, 1024, 1440];
const OUT = ".screenshots";

const PAGES = [
  ["home", `${WEB}/`],
  ["services", `${WEB}/services`],
  ["portfolio", `${WEB}/portfolio`],
  ["about", `${WEB}/about`],
  ["contact", `${WEB}/contact`],
  ["affiliate-tools", `${WEB}/affiliate-tools`],
  ["influencers", `${WEB}/influencers`],
  ["admin-login", `${ADMIN}/login`],
];

// Runs inside the page.
function contrastAudit() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (t, b) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
    return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const backgroundOf = (el) => {
    const layers = [];
    let hasImage = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== "none") hasImage = true;
      const c = rgba(cs.backgroundColor);
      if (c.a > 0) layers.push(c);
      if (c.a >= 0.99) break;
    }
    let result = { r: 255, g: 255, b: 255, a: 1 }; // browser canvas default
    for (const layer of layers.reverse()) result = over(layer, result);
    return { color: result, hasImage };
  };

  const failures = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0 || rect.width === 0 || rect.height === 0) continue;
    if (el.closest("[aria-hidden='true']") || el.closest("[disabled]")) continue;

    const { color: bg, hasImage } = backgroundOf(el);
    if (hasImage) continue; // gradients/photos can't be checked reliably
    const fg = over(rgba(cs.color), bg);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, bg);
    if (got + 0.01 < need) {
      const key = `${el.tagName}.${(el.className || "").toString().slice(0, 60)}|${text.slice(0, 30)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      failures.push({ text: text.slice(0, 50), ratio: +got.toFixed(2), need, fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, tag: el.tagName.toLowerCase() });
    }
  }
  return failures;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let problems = 0;

for (const [name, url] of PAGES) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 160)));
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 160)}`));

    let status = 0;
    try {
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
      status = res?.status() ?? 0;
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const contrast = await page.evaluate(contrastAudit);
      await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true });

      const notes = [];
      if (status >= 400) notes.push(`HTTP ${status}`);
      if (overflow > 1) notes.push(`horizontal overflow ${overflow}px`);
      if (consoleErrors.length) notes.push(`${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
      if (contrast.length) notes.push(`${contrast.length} contrast failure(s)`);
      problems += notes.length;
      console.log(`${notes.length ? "WARN" : "OK  "} ${name} @${width}${notes.length ? "  — " + notes.join("; ") : ""}`);
      if (width === 1440 || width === 360) {
        for (const f of contrast.slice(0, 8)) console.log(`       ${f.ratio}:1 (need ${f.need}) <${f.tag}> "${f.text}" fg ${f.fg} on ${f.bg}`);
      }
    } catch (error) {
      problems++;
      console.log(`FAIL ${name} @${width} — ${error.message.split("\n")[0]}`);
    }
    await context.close();
  }
}

await browser.close();
console.log(`\nDone. Screenshots in ${OUT}/ — ${problems} issue(s) flagged.`);
