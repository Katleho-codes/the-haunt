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

await page.clock.install({ time: new Date("2026-11-13T08:00:00+02:00") });
await page.goto(base);
await page.waitForSelector(".boot-screen", { state: "detached", timeout: 10000 });

const row = (title) => page.locator(".commitment-row", { has: page.locator(".commitment-title", { hasText: title }) });
const goto = async (label) => { await page.locator(".nav-item", { hasText: label }).click(); };

await step("fresh start shows an empty ledger with no auto-loaded demo data", async () => {
  await page.getByText("Your ledger is empty.").waitFor({ timeout: 3000 });
});

await step("demo data loads on request", async () => {
  await page.getByRole("button", { name: "load fictional demo data" }).click();
  await goto("The Archive");
  await row("Fibre account").waitFor({ timeout: 3000 });
  expect((await page.locator(".commitment-row").count()) === 6, "expected 6 demo records");
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
  expect((await row("Fibre account").innerText()).includes("25 Dec") || (await row("Fibre account").innerText()).includes("Dec"), "due date did not move to December");
  await goto("The Crypt");
  await row("Fibre account").waitFor({ timeout: 3000 });
});

await step("the latest completion can be undone from The Crypt", async () => {
  await row("Fibre account").locator(".row-more").click();
  await page.getByRole("button", { name: "Restore" }).click();
  await goto("The Clocktower");
  expect((await row("Fibre account").innerText()).includes("Due in") || (await row("Fibre account").innerText()).includes("Nov"), "fibre did not return to November");
});

await step("a reminder becomes due only when its time arrives", async () => {
  expect(/0 new/.test(await page.locator(".bell-button").getAttribute("aria-label")), "bell should start with 0 new");
  await page.clock.fastForward(9 * 86_400_000); // 22 Nov 2026 08:00 SAST, an hour before the fibre reminder
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

await step("sound is off by default", async () => {
  await goto("Keeper's Room");
  const switches = page.locator('[role="switch"]');
  const states = await switches.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-checked")));
  expect(states[0] === "false" && states[1] === "false", `sound toggles should start off, got ${states.join(",")}`);
});

await step("delete-all removes local data", async () => {
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete all my data" }).click();
  await page.locator(".toast", { hasText: "deleted" }).waitFor({ timeout: 3000 });
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("the-haunt.store")));
  expect(keys.length === 0 || (await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("the-haunt.store"))) ?? "{}").commitments?.length ?? 0)) === 0, "data still present");
});

await step("no console errors or page errors during the run", async () => {
  expect(problems.length === 0, problems.slice(0, 3).join(" | "));
});

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nAll browser steps passed." : `\n${failures} step(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
