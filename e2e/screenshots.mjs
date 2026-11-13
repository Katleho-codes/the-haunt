// Takes screenshots of every view at 390, 768 and 1280 px and reports horizontal overflow and tiny touch targets.
// Needs a running production server and Chrome or Edge. Usage: node e2e/screenshots.mjs [outDir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = process.argv[2] ?? "docs/evidence/screenshots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? "msedge", headless: true });
const widths = [[390, 844], [768, 1024], [1280, 900]];
const views = ["The Hall", "The Archive", "The Clocktower", "The Crypt", "Keeper's Room"];
const problems = [];

for (const [width, height] of widths) {
  const context = await browser.newContext({ timezoneId: "Africa/Johannesburg", locale: "en-ZA", viewport: { width, height }, hasTouch: width < 700 });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-11-21T10:00:00+02:00") });
  await page.goto(base);
  await page.waitForSelector(".boot-screen", { state: "detached" });
  await page.getByRole("button", { name: "load fictional demo data" }).click();
  for (const view of views) {
    if (width <= 700) await page.locator(".mobile-menu").click();
    await page.locator(".nav-item", { hasText: view }).click();
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`${view} @${width}: horizontal overflow ${overflow}px`);
    if (width <= 768) {
      const small = await page.evaluate(() => [...document.querySelectorAll("button, a, [role='switch'], select, input")]
        .filter((el) => el.getClientRects().length > 0 && !el.closest("[aria-hidden='true']"))
        .map((el) => { const r = el.getBoundingClientRect(); return { name: (el.getAttribute("aria-label") ?? el.textContent ?? el.className).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((t) => t.w < 24 || t.h < 24));
      for (const t of small) problems.push(`${view} @${width}: target below 24px: "${t.name}" ${t.w}x${t.h}`);
    }
    await page.screenshot({ path: `${out}/${view.replace(/[^A-Za-z]/g, "").toLowerCase()}-${width}.png`, fullPage: false });
  }
  await context.close();
}
await browser.close();
const unique = [...new Set(problems)];
console.log(unique.length === 0 ? `Screenshots saved to ${out}. No overflow and no targets below 24px.` : unique.join("\n"));
process.exit(unique.length === 0 ? 0 : 1);
