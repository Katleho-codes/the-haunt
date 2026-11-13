// Browser smoke test. Needs a running production server (npm run build && npx next start -p 3100)
// and an installed Chrome or Edge. Usage: node e2e/smoke.mjs [baseUrl]
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3100";
const channel = process.env.E2E_CHANNEL ?? "msedge";
const results = [];
let failures = 0;

async function step(name, fn) {
  try {
    await fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    failures++;
    results.push(`FAIL ${name}\n     ${String(error.message).split("\n")[0]}`);
  }
}
function expect(condition, message) { if (!condition) throw new Error(message); }

const browser = await chromium.launch({ channel, headless: true });
const context = await browser.newContext({ timezoneId: "Africa/Johannesburg", locale: "en-ZA", viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const problems = [];
page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") problems.push(`console: ${message.text()} ${message.location().url}`); });

// Count AudioContexts and external requests so we can prove sound is opt-in and fonts are self-hosted.
await page.addInitScript(() => {
  window.__audioContexts = 0;
  const Original = window.AudioContext;
  if (Original) window.AudioContext = class extends Original { constructor(...args) { super(...args); window.__audioContexts += 1; } };
});
const externalRequests = [];
page.on("request", (request) => { if (!request.url().startsWith(base) && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) externalRequests.push(request.url()); });
await page.clock.install({ time: new Date("2026-11-13T08:00:00+02:00") });
await page.goto(base);
await page.waitForSelector(".boot-screen", { state: "detached", timeout: 10000 });

const row = (title) => page.locator(".commitment-list .commitment-row", { has: page.locator(".commitment-title", { hasText: title }) });
const goto = async (label) => { await page.locator(".nav-item", { hasText: label }).click(); };

// Every interactive control must have an accessible name (aria-label, aria-labelledby, a label, visible text or title).
const unnamedControls = () => page.evaluate(() => {
  const selector = "button, [role=button], [role=switch], [role=menuitem], input:not([type=hidden]), select, textarea";
  const nameOf = (el) => {
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    const by = el.getAttribute("aria-labelledby");
    if (by) { const text = by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim(); if (text) return text; }
    if (el.labels && [...el.labels].some((l) => l.textContent.trim())) return "label";
    if (el.closest("label")?.textContent.trim()) return "wrapping label";
    if (["BUTTON"].includes(el.tagName) || el.getAttribute("role")) { const t = el.textContent.trim(); if (t) return t; }
    const title = el.getAttribute("title");
    return title && title.trim() ? title.trim() : "";
  };
  return [...document.querySelectorAll(selector)]
    .filter((el) => el.getClientRects().length > 0 && !el.closest("[aria-hidden='true']") && el.tabIndex !== -1)
    .filter((el) => !nameOf(el))
    .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""}`);
});

await step("fresh start shows an empty ledger with no auto-loaded demo data", async () => {
  await page.getByText("Your ledger is empty.").waitFor({ timeout: 3000 });
});

await step("demo data loads on request", async () => {
  await page.getByRole("button", { name: "load fictional demo data" }).click();
  await goto("The Archive");
  await row("Fibre account").waitFor({ timeout: 3000 });
  expect((await page.locator(".commitment-row").count()) === 6, "expected 6 demo records");
});

await step("the house starts calm and says so in text", async () => {
  expect((await page.locator(".app-shell").getAttribute("data-house")) === "calm", "expected data-house=calm");
  expect(/CALM/.test(await page.locator(".house-status-card").innerText()), "house status text should read CALM");
});

await step("branding and greeting: no trademark mark, no time-of-day claims", async () => {
  await goto("The Hall");
  const text = await page.locator("body").innerText();
  expect(!text.includes("™"), "the trademark mark should not be shown before the name is cleared");
  expect(!/good evening|tonight/i.test(text), "hard-coded time-of-day wording is still on the page");
});

await step("data survives a reload", async () => {
  await page.reload();
  await page.waitForSelector(".boot-screen", { state: "detached" });
  await goto("The Archive");
  await row("Fibre account").waitFor({ timeout: 3000 });
});

const capture = async (text) => {
  await goto("The Hall");
  await page.locator(".capture-input-wrap textarea").fill(text);
  await page.getByRole("button", { name: "Interpret quick capture" }).click();
  await page.locator(".commitment-modal").waitFor();
};

await step("capture: a pasted bill becomes a reviewable proposal, edits are saved, nothing is saved before confirming", async () => {
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("the-haunt.store.v1.local")).commitments.length);
  await capture("My fibre bill is R899 and is due on the 25th of every month.");
  const modal = page.locator(".commitment-modal");
  const banner = await modal.locator(".extraction-notice").innerText();
  expect(/not AI/.test(banner), "review must say the reader is not AI");
  expect((await modal.locator('input[placeholder="e.g. Pay school fees"]').inputValue()) === "Fibre bill", "title not read");
  expect((await modal.locator('input[type="number"]').inputValue()) === "899", "amount not read");
  expect((await modal.locator('input[type="date"]').inputValue()) === "2026-11-25", "due date not read");
  expect(/CHECK THIS/.test(await modal.innerText()), "uncertain due date is not marked in text");
  expect(/Confirm the next due date/.test(banner), "review note missing");
  const during = await page.evaluate(() => JSON.parse(localStorage.getItem("the-haunt.store.v1.local")).commitments.length);
  expect(during === before, "a commitment was saved before the user confirmed");
  await modal.locator('input[type="number"]').fill("900");
  await modal.getByRole("button", { name: /Confirm/ }).click();
  await goto("The Archive");
  const text = await row("Fibre bill").innerText();
  expect(/900/.test(text) && !/899/.test(text), "saved record should carry the edited amount");
});

await step("capture: a weight is not money; word currencies are flagged; a time is reported, not lost", async () => {
  await capture("Buy 2 pounds of sugar on 25 Nov 2026");
  expect((await page.locator('.commitment-modal input[type="number"]').inputValue()) === "", "a weight was read as an amount");
  await page.locator(".commitment-modal").getByRole("button", { name: "Cancel" }).click();
  await capture("Pay 20 pounds to the club on 25 Nov 2026");
  const flagged = await page.locator(".commitment-modal .extraction-notice").innerText();
  expect(/pounds.*GBP/.test(flagged), "word currency was not flagged");
  await page.locator(".commitment-modal").getByRole("button", { name: "Cancel" }).click();
  await capture("Dentist 25 November at 14:30");
  const modal = page.locator(".commitment-modal");
  expect(/14:30.*not read yet/.test(await modal.locator(".extraction-notice").innerText()), "ignored time was not reported");
  expect((await modal.locator("textarea").inputValue()).includes("14:30"), "the time was not kept in the details");
  expect((await modal.locator('input[placeholder="e.g. Pay school fees"]').inputValue()) === "Dentist", "date text leaked into the title");
  await modal.getByRole("button", { name: "Cancel" }).click();
  await page.locator(".capture-input-wrap textarea").fill("");
});

await step("capture: an unclear date is left empty, flagged, and cannot be saved", async () => {
  await capture("The vehicle licence expires in March; remind me before it expires.");
  const modal = page.locator(".commitment-modal");
  expect((await modal.locator('input[type="date"]').inputValue()) === "", "a date was invented");
  expect(/Only the month \(March\)/.test(await modal.locator(".extraction-notice").innerText()), "month-only note missing");
  expect(await modal.getByRole("button", { name: /Confirm/ }).isDisabled(), "confirm should be disabled without a date");
  await modal.getByRole("button", { name: "Cancel" }).click();
  await page.locator(".capture-input-wrap textarea").fill("");
});
await step("row menu options are hoverable and sit above the next row", async () => {
  await goto("The Archive");
  const first = page.locator(".commitment-row").first();
  await first.locator(".row-more").click();
  const option = first.locator(".row-menu button").first();
  const box = await option.boundingBox();
  const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".row-menu") !== null, { x: box.x + 10, y: box.y + box.height / 2 });
  expect(top, "menu option is covered by another element");
  await page.keyboard.press("Escape");
  await page.mouse.click(5, 5);
});

await step("clocktower lists the next three dates", async () => {
  await goto("The Clocktower");
  const text = await row("Fibre account").innerText();
  expect(/Next:/.test(text), "no Next: dates on the fibre row");
});

await step("completing a recurring item advances it and records history in The Crypt", async () => {
  await row("Fibre account").locator(".complete-control").click();
  await page.locator(".toast", { hasText: "Next:" }).waitFor({ timeout: 3000 });
  expect(/25 Dec\.? 2026/.test(await row("Fibre account").innerText()), `due date should now be 25 Dec 2026, row says: ${(await row("Fibre account").innerText()).replace(/\n/g, " | ")}`);
  await goto("The Crypt");
  await row("Fibre account").waitFor({ timeout: 3000 });
  expect(/25 Nov\.? 2026/.test(await row("Fibre account").innerText()), "the Crypt record should keep the completed date, 25 Nov 2026");
});

await step("export contains commitments, completion history, reminders and settings", async () => {
  await goto("Keeper's Room");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export my data" }).click()]);
  const { readFileSync } = await import("node:fs");
  const bundle = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(bundle.app === "the-haunt" && bundle.version === 1, "missing app/version");
  expect(["commitments", "occurrences", "reminders", "settings", "exportedAt"].every((k) => k in bundle), `missing keys: ${Object.keys(bundle).join(",")}`);
  expect(bundle.commitments.length >= 7, `expected the demo records plus the captured one, got ${bundle.commitments.length}`);
  expect(bundle.occurrences.some((o) => o.id === "demo-fibre:2026-11-25"), "completion history for the fibre account is missing");
  expect(bundle.reminders.length > 0 && bundle.reminders.every((r) => !("title" in r)), "reminders missing, or they carry commitment text");
  expect(bundle.settings.ambience === false && bundle.settings.effects === false, "settings missing");
  await page.locator(".toast", { hasText: "no import yet" }).waitFor({ timeout: 3000 });
});

await step("the latest completion can be undone from The Crypt", async () => {
  await goto("The Crypt");
  await row("Fibre account").locator(".row-more").click();
  await page.getByRole("menuitem", { name: "Restore" }).click();
  await goto("The Clocktower");
  expect(/25 Nov\.? 2026/.test(await row("Fibre account").innerText()), "fibre did not return to 25 Nov 2026");
  await goto("The Crypt");
  expect((await row("Fibre account").count()) === 0, "the undone completion should leave The Crypt");
});

await step("archive: an archived item is listed under Archived and can be restored", async () => {
  await goto("The Archive");
  await row("Service the car").locator(".row-more").click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.locator(".toast", { hasText: "Archived" }).waitFor({ timeout: 3000 });
  expect((await row("Service the car").count()) === 0, "archived item should leave the Active list");
  await page.getByRole("button", { name: /^Archived \(/ }).click();
  await row("Service the car").waitFor({ timeout: 3000 });
  expect(/archived records/.test(await page.locator(".filter-count").innerText()), "count label should say archived records");
  expect(await row("Service the car").locator(".complete-control").isDisabled(), "an archived item cannot be completed until restored");
  await row("Service the car").locator(".row-more").click();
  await page.getByRole("menuitem", { name: "Restore" }).click();
  await page.locator(".toast", { hasText: "Restored" }).waitFor({ timeout: 3000 });
  expect((await row("Service the car").count()) === 0, "restored item should leave the Archived list");
  await page.getByRole("button", { name: /^Active \(/ }).click();
  await row("Service the car").waitFor({ timeout: 3000 });
});

await step("row menu is keyboard operable: focus moves in, Escape closes and returns focus", async () => {
  await goto("The Archive");
  const first = page.locator(".commitment-list .commitment-row").first();
  const more = first.locator(".row-more");
  await more.focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem"), "focus did not move into the menu");
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem"), "arrow key lost focus");
  await page.keyboard.press("Escape");
  expect((await first.locator(".row-menu").count()) === 0, "Escape did not close the menu");
  expect(await more.evaluate((el) => el === document.activeElement), "focus did not return to the More button");
  expect((await more.getAttribute("aria-expanded")) === "false", "aria-expanded should be false");
});

await step("search: Ctrl+K opens a labelled search and Escape closes it", async () => {
  await goto("The Hall");
  await page.keyboard.press("Control+k");
  const input = page.getByRole("textbox", { name: "Search commitments" });
  await input.waitFor({ timeout: 2000 });
  expect(await input.evaluate((el) => el === document.activeElement), "search input should be focused");
  await page.keyboard.press("Escape");
  expect((await input.count()) === 0, "Escape should close search");
});

await step("every control on every view and dialog has an accessible name", async () => {
  const missing = [];
  for (const label of ["The Hall", "The Archive", "The Clocktower", "The Crypt", "Keeper's Room"]) {
    await goto(label);
    for (const name of await unnamedControls()) missing.push(`${label}: ${name}`);
  }
  await goto("The Archive");
  await page.locator(".commitment-list .commitment-row").first().locator(".row-more").click();
  for (const name of await unnamedControls()) missing.push(`row menu: ${name}`);
  await page.keyboard.press("Escape");
  await page.locator(".floating-add").click();
  for (const name of await unnamedControls()) missing.push(`dialog: ${name}`);
  await page.getByRole("button", { name: "Customise" }).click();
  for (const name of await unnamedControls()) missing.push(`dialog reminders: ${name}`);
  await page.keyboard.press("Escape");
  await page.locator(".bell-button").click();
  for (const name of await unnamedControls()) missing.push(`reminders panel: ${name}`);
  await page.keyboard.press("Escape");
  await goto("The Archive");
  await page.keyboard.press("Control+k");
  for (const name of await unnamedControls()) missing.push(`search: ${name}`);
  await page.keyboard.press("Escape");
  expect(missing.length === 0, `unnamed controls: ${[...new Set(missing)].join("; ")}`);
});

await step("completing a one-off shows a dissolve, a text message and a working Undo", async () => {
  await goto("The Archive");
  await row("Dentist appointment").locator(".complete-control").click();
  await page.locator(".row-ghost").first().waitFor({ timeout: 2000 });
  const toast = page.locator(".toast", { hasText: "Laid to rest" });
  await toast.waitFor({ timeout: 2000 });
  expect((await row("Dentist appointment").count()) === 0, "the finished row should leave the Archive");
  await toast.getByRole("button", { name: "Undo" }).click();
  await row("Dentist appointment").waitFor({ timeout: 2000 });
});

await step("a reminder becomes due only when its time arrives", async () => {
  expect(/0 new/.test(await page.locator(".bell-button").getAttribute("aria-label")), "bell should start with 0 new");
  await page.clock.fastForward(9 * 86_400_000); // 22 Nov 2026 08:00 SAST, an hour before the fibre reminder
  await page.waitForFunction(() => document.querySelector(".app-shell")?.getAttribute("data-house") === "restless", null, { timeout: 5000 });
  expect(/RESTLESS/.test(await page.locator(".house-status-card").innerText()), "house status text should read RESTLESS");
  await page.locator(".bell-button").click();
  let text = await page.locator(".notification-centre").innerText();
  expect(/Dentist appointment/.test(text), "the earlier dentist reminder should be due by now");
  expect(!/Fibre account/.test(text), "fibre reminder fired before 09:00");
  await page.keyboard.press("Escape");
  await page.clock.fastForward(2 * 3_600_000); // 10:00 SAST
  await page.waitForFunction(() => /[1-9]\d* new/.test(document.querySelector(".bell-button")?.getAttribute("aria-label") ?? ""), null, { timeout: 5000 });
  await page.locator(".bell-button").click();
  text = await page.locator(".notification-centre").innerText();
  expect(/Fibre account/.test(text), "fibre reminder missing after 09:00");
  expect(/NEW/.test(text), "a reminder listed for the first time should read NEW");
  await page.keyboard.press("Escape");
});

await step("the notification centre reads SEEN after viewing and uses honest wording", async () => {
  await page.clock.fastForward(60_000);
  await page.locator(".bell-button").click();
  const panel = page.locator(".notification-centre");
  await panel.waitFor();
  const text = await panel.innerText();
  expect(/In-app only/.test(text), "missing in-app-only notice");
  expect(!/delivered/i.test(text) && !/\bsent\b/i.test(text.replace("Nothing is sent by email, push or text message.", "")), "panel uses delivery wording");
  await page.keyboard.press("Escape");
  await page.locator(".bell-button").click();
  const reopened = await page.locator(".notification-centre").innerText();
  expect(/SEEN/.test(reopened) && !/NEW/.test(reopened), "reminders should read SEEN after the centre listed them once");
});

await step("snooze hides a reminder and it returns later; dismiss removes it for good", async () => {
  const panel = page.locator(".notification-centre");
  // A key that stays stable as time passes: title, due date and "N days before" (not the changing "due in N days").
  const keys = () => panel.locator(".notification-list > li").evaluateAll((items) =>
    items.map((li) => {
      const title = li.querySelector("strong")?.textContent ?? "";
      const detail = li.querySelectorAll("span")[2]?.textContent ?? "";
      return `${title}|${detail.split(" · ")[0]}|${detail.split("reminder ")[1] ?? ""}`;
    }));
  const before = await keys();
  expect(before.length >= 2, `need at least two reminders for this step, found ${before.length}`);
  const snoozed = before[0];
  await panel.getByRole("button", { name: "Snooze 1 hour" }).first().click();
  expect(!(await keys()).includes(snoozed), "snoozed reminder still visible");
  await page.clock.fastForward(65 * 60_000);
  await page.waitForFunction(() => document.querySelectorAll(".notification-list > li").length > 0, null, { timeout: 5000 });
  expect((await keys()).includes(snoozed), "snoozed reminder did not return after an hour");
  const dismissed = (await keys())[0];
  await panel.getByRole("button", { name: "Dismiss" }).first().click();
  expect(!(await keys()).includes(dismissed), "dismissed reminder still visible");
  await page.clock.fastForward(48 * 3_600_000);
  expect(!(await keys()).includes(dismissed), "dismissed reminder came back");
});
await step("test reminder is clearly labelled as a test", async () => {
  await page.getByRole("button", { name: "Send test reminder" }).click();
  const text = await page.locator(".notification-test").innerText();
  expect(/TEST/.test(text) && /No commitment is involved/.test(text), "test reminder not labelled");
  await page.keyboard.press("Escape");
});

await step("no horizontal scroll on any view at 390px", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const label of ["The Hall", "The Archive", "The Clocktower", "The Crypt", "Keeper's Room"]) {
    await page.locator(".mobile-menu").click();
    await goto(label);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow <= 0, `${label} overflows by ${overflow}px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
});

await step("sound is off by default and no audio is created until it is turned on", async () => {
  await goto("Keeper's Room");
  const ambient = page.getByRole("switch", { name: "Ambient atmosphere" });
  const effects = page.getByRole("switch", { name: "Interaction sounds" });
  expect((await ambient.getAttribute("aria-checked")) === "false" && (await effects.getAttribute("aria-checked")) === "false", "sound toggles should start off");
  expect((await page.evaluate(() => window.__audioContexts)) === 0, "an AudioContext was created while sound was off");
  await ambient.click(); // a user gesture
  await page.waitForFunction(() => window.__audioContexts === 1, null, { timeout: 3000 });
  await ambient.click();
});

await step("motion and atmosphere settings apply immediately and persist", async () => {
  await page.getByLabel("Motion", { exact: true }).selectOption("reduced");
  expect((await page.evaluate(() => document.documentElement.dataset.motion)) === "reduced", "data-motion not applied");
  const duration = await page.evaluate(() => getComputedStyle(document.querySelector(".boot-mark, .hero-fog, .toast, .status-dot") ?? document.body).animationDuration);
  expect(duration === "0s" || duration === "1e-05s" || /^0(\.0+)?s$/.test(duration) || parseFloat(duration) < 0.01, `animation not suppressed: ${duration}`);
  await page.getByLabel("Atmosphere", { exact: true }).selectOption("low");
  expect((await page.evaluate(() => document.documentElement.dataset.intensity)) === "low", "data-intensity not applied");
  await page.reload();
  await page.waitForSelector(".boot-screen", { state: "detached" });
  expect((await page.evaluate(() => document.documentElement.dataset.motion)) === "reduced", "motion setting did not persist");
  await goto("Keeper's Room");
  await page.getByLabel("Motion", { exact: true }).selectOption("system");
  await page.getByLabel("Atmosphere", { exact: true }).selectOption("full");
});

await step("with the device set to reduced motion, effects are skipped but the result is still announced", async () => {
  const quiet = await browser.newContext({ timezoneId: "Africa/Johannesburg", locale: "en-ZA", reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const q = await quiet.newPage();
  await q.goto(base);
  await q.waitForSelector(".boot-screen", { state: "detached" });
  await q.getByRole("button", { name: "load fictional demo data" }).click();
  await q.locator(".nav-item", { hasText: "The Archive" }).click();
  const target = q.locator(".commitment-row", { has: q.locator(".commitment-title", { hasText: "Dentist appointment" }) });
  await target.locator(".complete-control").click();
  await q.locator(".toast", { hasText: "Laid to rest" }).waitFor({ timeout: 2000 });
  expect((await q.locator(".row-ghost").count()) === 0, "dissolve ghost should not be drawn under reduced motion");
  const fog = await q.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".hero-fog") ?? document.body).animationDuration));
  expect(fog < 0.01, `fog animation should be suppressed by the device setting, got ${fog}s`);
  await quiet.close();
});

await step("keyboard: the dialog traps focus, Escape closes it and focus returns to the opener", async () => {
  await goto("The Hall");
  await page.locator(".floating-add").focus();
  await page.keyboard.press("Enter");
  await page.locator(".commitment-modal").waitFor();
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest(".commitment-modal")), `focus escaped the dialog after ${i + 1} Tab presses`);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest(".commitment-modal")), "focus escaped on Shift+Tab");
  await page.keyboard.press("Escape");
  await page.locator(".commitment-modal").waitFor({ state: "detached" });
  expect(await page.evaluate(() => document.activeElement?.classList.contains("floating-add")), "focus did not return to the Add button");
});

await step("fonts are self-hosted: no request left the site", async () => {
  expect(externalRequests.length === 0, `external requests: ${externalRequests.slice(0, 3).join(", ")}`);
});

await step("delete-all removes every trace: data, history, reminders, backups and prototype copies", async () => {
  await goto("Keeper's Room");
  // Plant the leftovers a real browser can accumulate: a corrupt-data backup and prototype-format copies.
  await page.evaluate(() => {
    localStorage.setItem("the-haunt.corrupt.local.2026-11-01T00:00:00.000Z", JSON.stringify([{ title: "Private surgery", amount: 9999 }]));
    localStorage.setItem("the-haunt.commitments.v1", JSON.stringify([{ title: "Old prototype record" }]));
    localStorage.setItem("the-haunt.settings.v1", "{}");
    localStorage.setItem("unrelated.site.key", "must survive");
  });
  const before = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("the-haunt.")).length);
  expect(before >= 4, `setup should leave several the-haunt keys, found ${before}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete all my data" }).click();
  await page.locator(".toast", { hasText: "deleted" }).waitFor({ timeout: 3000 });
  const after = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("the-haunt."));
    const store = JSON.parse(localStorage.getItem("the-haunt.store.v1.local") ?? "{}");
    return { keys, commitments: store.commitments?.length ?? 0, occurrences: store.occurrences?.length ?? 0, reminders: store.reminders?.length ?? 0, unrelated: localStorage.getItem("unrelated.site.key"), everything: JSON.stringify(localStorage) };
  });
  expect(after.keys.every((k) => k === "the-haunt.store.v1.local"), `leftover keys: ${after.keys.join(", ")}`);
  expect(after.commitments === 0 && after.occurrences === 0 && after.reminders === 0, `data still stored: ${after.commitments}/${after.occurrences}/${after.reminders}`);
  expect(!/Private surgery|Old prototype|Fibre/.test(after.everything), "personal text is still in browser storage");
  expect(after.unrelated === "must survive", "delete-all must not touch other sites' keys");
});

await step("no console errors or page errors during the run", async () => {
  expect(problems.length === 0, problems.slice(0, 3).join(" | "));
});

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nAll browser steps passed." : `\n${failures} step(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
