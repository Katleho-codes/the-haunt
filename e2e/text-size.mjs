// Text size audit in a real browser: every visible text element on every view, dialog and panel, at three widths.
// Floors (owner decision, 14 November 2026): 11px for monospace text, 12px for everything else.
// Hidden decorative text (aria-hidden) is exempt. Needs a running production server and Chrome or Edge.
// Usage: node e2e/text-size.mjs [baseUrl]
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3100";
const MONO_FLOOR = 11;
const BODY_FLOOR = 12;
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? "msedge", headless: true });
const failures = new Map();
let checked = 0;

async function audit(page, label) {
  const result = await page.evaluate(({ monoFloor, bodyFloor }) => {
    for (const animation of document.getAnimations()) { try { animation.finish(); } catch { /* infinite */ } }
    const out = [];
    let count = 0;
    for (const element of document.body.querySelectorAll("*")) {
      const own = [...element.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (!own || element.closest("[aria-hidden='true']") || element.getClientRects().length === 0) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
      const size = parseFloat(style.fontSize);
      const mono = /mono|courier/i.test(style.fontFamily);
      const floor = mono ? monoFloor : bodyFloor;
      count += 1;
      if (size + 0.01 < floor) {
        out.push({
          selector: `${element.tagName.toLowerCase()}${[...element.classList].map((c) => `.${c}`).join("")}`,
          parent: element.parentElement ? `${element.parentElement.tagName.toLowerCase()}${[...element.parentElement.classList].map((c) => `.${c}`).join("")}` : "",
          size, mono, sample: element.textContent.trim().slice(0, 30),
        });
      }
    }
    return { count, out };
  }, { monoFloor: MONO_FLOOR, bodyFloor: BODY_FLOOR });
  checked += result.count;
  for (const f of result.out) {
    const key = `${f.selector} < ${f.parent} ${f.size}px ${f.mono ? "mono" : "body"}`;
    if (!failures.has(key)) failures.set(key, { ...f, where: new Set() });
    failures.get(key).where.add(label);
  }
}

for (const [width, height] of [[390, 844], [768, 1024], [1280, 900]]) {
  const context = await browser.newContext({ viewport: { width, height }, timezoneId: "Africa/Johannesburg", locale: "en-ZA" });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-11-21T10:00:00+02:00") });
  await page.goto(base);
  await page.waitForSelector(".boot-screen", { state: "detached" });
  await audit(page, `${width} empty`);
  await page.getByRole("button", { name: "load fictional demo data" }).click();
  const goto = async (name) => {
    if (width <= 700) await page.locator(".mobile-menu").click();
    await page.locator(".nav-item", { hasText: name }).click();
  };
  if (width <= 700) { await page.locator(".mobile-menu").click(); await audit(page, `${width} menu`); await page.locator(".sidebar-close").click(); }
  for (const name of ["The Hall", "The Archive", "The Clocktower", "The Crypt", "Keeper's Room"]) {
    await goto(name);
    if (name === "Keeper's Room") await page.locator(".sound-test summary").click();
    await audit(page, `${width} ${name}`);
  }
  await goto("The Archive");
  await page.locator(".commitment-list .commitment-row").first().locator(".row-more").click();
  await audit(page, `${width} row menu`);
  await page.keyboard.press("Escape");
  await page.locator(".floating-add").click();
  await page.getByRole("button", { name: "Customise" }).click();
  await audit(page, `${width} new dialog`);
  await page.keyboard.press("Escape");
  await goto("The Hall");
  await page.getByRole("textbox", { name: "Quick capture note" }).fill("The vehicle licence expires in March at 9am");
  await page.getByRole("button", { name: "Interpret quick capture" }).click();
  await audit(page, `${width} capture review`);
  await page.keyboard.press("Escape");
  await page.locator(".bell-button").click();
  await page.getByRole("button", { name: "Send test reminder" }).click();
  await audit(page, `${width} reminders`);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await audit(page, `${width} search`);
  await context.close();
}
await browser.close();

console.log(`Checked ${checked} text elements (floors: ${MONO_FLOOR}px mono, ${BODY_FLOOR}px other).`);
for (const [key, f] of failures) console.log(`FAIL ${key} "${f.sample}" [${[...f.where].slice(0, 4).join(", ")}${f.where.size > 4 ? ", ..." : ""}]`);
console.log(failures.size === 0 ? "All text meets the size floors." : `\n${failures.size} distinct text style(s) below the floor.`);
process.exit(failures.size === 0 ? 0 : 1);
