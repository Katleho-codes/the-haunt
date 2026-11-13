// Text contrast audit in a real browser. Needs a running production server and Chrome or Edge.
// Usage: node e2e/contrast.mjs [baseUrl]   (E2E_CHANNEL=chrome for Chrome)
// It measures every visible text element on each view: computed text colour against the composited
// background of its ancestors (gradients are approximated by their average colour stop).
// WCAG AA: 4.5:1 for normal text, 3:1 for large text (>= 24px, or >= 18.66px bold). Exit code 1 on any failure.
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? "msedge", headless: true });
const context = await browser.newContext({ timezoneId: "Africa/Johannesburg", locale: "en-ZA", viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
await page.clock.install({ time: new Date("2026-11-21T10:00:00+02:00") }); // some demo items are overdue by then
await page.goto(base);
await page.waitForSelector(".boot-screen", { state: "detached" });
await page.getByRole("button", { name: "load fictional demo data" }).click();

async function measure(label) {
  return page.evaluate((viewLabel) => {
    // Entrance animations start transparent; measure the settled state.
    for (const animation of document.getAnimations()) { try { animation.finish(); } catch { /* infinite animations cannot finish */ } }
    const parse = (value) => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r, g, b, a };
    };
    const over = (top, bottom) => {
      const a = top.a + bottom.a * (1 - top.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      const mix = (t, b2) => (t * top.a + b2 * bottom.a * (1 - top.a)) / a;
      return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const gradientAverage = (image) => {
      const stops = [...image.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter(Boolean);
      if (stops.length === 0) return null;
      const sum = stops.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b, a: acc.a + c.a }), { r: 0, g: 0, b: 0, a: 0 });
      return { r: sum.r / stops.length, g: sum.g / stops.length, b: sum.b / stops.length, a: sum.a / stops.length };
    };
    const backgroundOf = (element) => {
      const layers = [];
      for (let node = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        const color = parse(style.backgroundColor);
        if (color && color.a > 0) layers.push(color);
        if (style.backgroundImage.includes("gradient")) { const avg = gradientAverage(style.backgroundImage); if (avg && avg.a > 0) layers.push(avg); }
        if (color && color.a >= 1) break;
      }
      let result = { r: 8, g: 11, b: 11, a: 1 }; // --void
      for (const layer of layers.reverse()) result = over(layer, result);
      return result;
    };
    const opacityOf = (element) => { let o = 1; for (let n = element; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
    const failures = [];
    let checked = 0;
    for (const element of document.body.querySelectorAll("*")) {
      const own = [...element.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (!own) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (element.getClientRects().length === 0) continue;
      if (element.closest("[aria-hidden='true']")) continue;
      if (element.closest(":disabled")) continue; // disabled controls are exempt from WCAG contrast
      const fg = parse(style.color);
      if (!fg) continue;
      const bg = backgroundOf(element);
      const alpha = fg.a * opacityOf(element);
      const text = over({ ...fg, a: alpha }, bg);
      const L1 = lum(text) + 0.05;
      const L2 = lum(bg) + 0.05;
      const ratio = Math.max(L1, L2) / Math.min(L1, L2);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      checked += 1;
      if (ratio < need) {
        failures.push({
          view: viewLabel,
          selector: `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`,
          ratio: Number(ratio.toFixed(2)), need, size, color: style.color,
          sample: element.textContent.trim().slice(0, 40),
        });
      }
    }
    return { checked, failures };
  }, label);
}

const all = [];
let total = 0;
const record = async (label) => { const r = await measure(label); total += r.checked; all.push(...r.failures); };

for (const [name, nav] of [["The Hall", "The Hall"], ["The Archive", "The Archive"], ["The Clocktower", "The Clocktower"], ["The Crypt", "The Crypt"], ["Keeper's Room", "Keeper's Room"]]) {
  await page.locator(".nav-item", { hasText: nav }).click();
  await record(name);
}
await page.locator(".nav-item", { hasText: "The Hall" }).click();
await page.locator(".hero-cta").first().click();
await page.locator(".commitment-modal").waitFor();
await record("New commitment dialog");
await page.keyboard.press("Escape");
await page.locator(".capture-input-wrap textarea").fill("The vehicle licence expires in March");
await page.getByRole("button", { name: "Interpret quick capture" }).click();
await page.locator(".commitment-modal").waitFor();
await record("Capture review dialog");
await page.keyboard.press("Escape");
await page.locator(".bell-button").click();
await page.getByRole("button", { name: "Send test reminder" }).click();
await record("Reminders panel");
await browser.close();

const unique = new Map();
for (const f of all) {
  const key = `${f.selector}|${f.color}`;
  if (!unique.has(key)) unique.set(key, { ...f, views: new Set([f.view]) });
  else unique.get(key).views.add(f.view);
}
console.log(`Checked ${total} text elements across the views.`);
for (const f of unique.values()) console.log(`FAIL ${f.ratio}:1 (needs ${f.need}) ${f.selector} ${f.color} ${f.size}px "${f.sample}" [${[...f.views].join(", ")}]`);
console.log(unique.size === 0 ? "All measured text meets WCAG AA contrast." : `\n${unique.size} distinct failing style(s).`);
process.exit(unique.size === 0 ? 0 : 1);
