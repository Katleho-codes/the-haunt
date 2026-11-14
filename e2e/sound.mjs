// Browser test for the sound system. Needs a running production server and Chrome or Edge.
// Usage: node e2e/sound.mjs [baseUrl]   (E2E_CHANNEL=chrome for Chrome)
// It cannot hear anything: it reads the engine's event log (enabled by a debug flag) and counts AudioContexts.
import { chromium } from "playwright-core";
import { SOUND_MAP } from "../lib/audio/sound-map.ts";

// What each sound should be: the owner's file where the map names one, otherwise built in.
const EXPECTED_SOURCE = Object.fromEntries(Object.entries(SOUND_MAP).map(([event, entry]) => [event, entry.file ? "file" : "synth"]));

const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? "msedge", headless: true });
const context = await browser.newContext({ timezoneId: "Africa/Johannesburg", locale: "en-ZA", viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const results = [];
let failures = 0;
const problems = [];
page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") problems.push(`console: ${message.text()}`); });

await page.addInitScript(() => {
  localStorage.setItem("the-haunt.debug.sound", "1");
  window.__contexts = 0;
  const Original = window.AudioContext;
  if (Original) window.AudioContext = class extends Original { constructor(...a) { super(...a); window.__contexts += 1; } };
});
await page.clock.install({ time: new Date("2026-11-13T08:00:00+02:00") });
await page.goto(base);
await page.waitForSelector(".boot-screen", { state: "detached" });

async function step(name, fn) {
  try { await fn(); results.push(`PASS ${name}`); }
  catch (error) { failures++; results.push(`FAIL ${name}\n     ${String(error.message).split("\n")[0]}`); }
}
const expect = (ok, message) => { if (!ok) throw new Error(message); };
const log = () => page.evaluate(() => window.__hauntSound.log());
const clear = () => page.evaluate(() => window.__hauntSound.clear());
const state = () => page.evaluate(() => window.__hauntSound.state());
const contexts = () => page.evaluate(() => window.__contexts);
const goto = (label) => page.locator(".nav-item", { hasText: label }).click();
const row = (title) => page.locator(".commitment-list .commitment-row", { has: page.locator(".commitment-title", { hasText: title }) });

/** Clears the log, runs the action, waits briefly, and checks exactly these events played, in order. */
async function sounds(action, expected, label = "") {
  await clear();
  await action();
  await page.waitForTimeout(500); // a sound whose file is still loading may wait up to 350 ms for it
  const got = (await log()).map((e) => e.event);
  expect(JSON.stringify(got) === JSON.stringify(expected), `${label ? label + ": " : ""}expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

await step("with sound off, clicking around creates no audio and plays nothing", async () => {
  await page.getByRole("button", { name: "load fictional demo data" }).click();
  await goto("The Archive");
  await goto("The Hall");
  await page.locator(".floating-add").click();
  await page.keyboard.press("Escape");
  expect((await contexts()) === 0, `AudioContexts created: ${await contexts()}`);
  expect((await log()).length === 0, "something was played");
  expect((await state()).unlocked === true, "a click should unlock the engine (without creating audio)");
});

await step("turning interaction sounds on creates one context and plays the toggle sound", async () => {
  await goto("Keeper's Room");
  await sounds(() => page.getByRole("switch", { name: "Interaction sounds" }).click(), ["ui.toggle"]);
  expect((await contexts()) === 1, `expected 1 AudioContext, got ${await contexts()}`);
});

await step("interface: navigate, click, open and close each play their own sound, once", async () => {
  await sounds(() => goto("The Archive"), ["ui.navigate"]);
  await sounds(() => page.getByRole("button", { name: /^Archived \(/ }).click(), ["ui.click"]);
  await sounds(() => page.getByRole("button", { name: /^Active \(/ }).click(), ["ui.click"]);
  await sounds(() => page.locator(".floating-add").click(), ["ui.open"]);
  await sounds(() => page.keyboard.press("Escape"), ["ui.close"]);
  await sounds(() => page.keyboard.press("Control+k"), ["ui.open"], "Ctrl+K");
  await sounds(() => page.keyboard.press("Escape"), ["ui.close"]);
  await sounds(() => row("Fibre account").locator(".row-more").click(), ["ui.open"], "row menu open");
  await sounds(() => page.mouse.click(640, 20), ["ui.close"], "row menu closed by clicking outside");
});

await step("commitments: save, complete, undo, archive, restore and delete", async () => {
  await sounds(() => page.locator(".floating-add").click(), ["ui.open"]);
  await page.locator('.commitment-modal input[placeholder="e.g. Pay school fees"]').fill("Sound test item");
  await sounds(() => page.getByRole("button", { name: "Add to the ledger" }).click(), ["commitment.save"]);
  await sounds(() => row("Sound test item").locator(".complete-control").click(), ["commitment.complete"]);
  await sounds(() => page.locator(".toast").getByRole("button", { name: "Undo" }).click(), ["commitment.restore"]);
  await row("Sound test item").locator(".row-more").click();
  await sounds(() => page.getByRole("menuitem", { name: "Archive" }).click(), ["commitment.archive"]);
  await page.getByRole("button", { name: /^Archived \(/ }).click();
  await row("Sound test item").locator(".row-more").click();
  await sounds(() => page.getByRole("menuitem", { name: "Restore" }).click(), ["commitment.restore"]);
  await page.getByRole("button", { name: /^Active \(/ }).click();
  await row("Sound test item").locator(".row-more").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await sounds(() => page.getByRole("menuitem", { name: "Delete" }).click(), ["system.warning"]);
  await row("Sound test item").locator(".row-more").click();
  page.once("dialog", (dialog) => dialog.accept());
  await sounds(() => page.getByRole("menuitem", { name: "Delete" }).click(), ["system.warning", "commitment.delete"]);
  expect((await row("Sound test item").count()) === 0, "the item was not deleted");
});

await step("capture: reading a note, then confirming it", async () => {
  await goto("The Hall");
  await page.getByRole("textbox", { name: "Quick capture note" }).fill("My fibre bill is R899 and is due on the 25th of every month.");
  await sounds(() => page.getByRole("button", { name: "Interpret quick capture" }).click(), ["capture.interpret"]);
  await sounds(() => page.locator(".commitment-modal").getByRole("button", { name: /Confirm/ }).click(), ["commitment.save"]);
});

await step("reminders: arrive while open, test, snooze and dismiss", async () => {
  await clear();
  await page.clock.fastForward(9 * 86_400_000 + 2 * 3_600_000); // 22 Nov, 10:00: several reminders are now due
  await page.waitForFunction(() => window.__hauntSound.log().some((e) => e.event === "reminder.arrive"), null, { timeout: 5000 });
  expect((await log()).filter((e) => e.event === "reminder.arrive").length === 1, "one bell for the batch that arrived");
  await sounds(() => page.locator(".bell-button").click(), ["ui.open"]);
  await sounds(() => page.getByRole("button", { name: "Send test reminder" }).click(), ["reminder.arrive"]);
  await sounds(() => page.getByRole("button", { name: "Snooze 1 hour" }).first().click(), ["reminder.snooze"]);
  await sounds(() => page.locator(".notification-list").getByRole("button", { name: "Dismiss" }).first().click(), ["reminder.dismiss"]);
  await sounds(() => page.keyboard.press("Escape"), ["ui.close"]);
});

await step("ambience starts and stops with its switch, using the owner's loop when one is set and never the built-in bed first", async () => {
  await goto("Keeper's Room");
  const want = EXPECTED_SOURCE["ambience.bed"] === "file" ? "file" : "procedural";
  const seen = new Set();
  await page.getByRole("switch", { name: "Ambient atmosphere" }).click();
  for (let i = 0; i < 20; i++) { seen.add((await state()).ambient); await page.waitForTimeout(50); }
  expect((await state()).ambient === want, `ambient should be "${want}", got ${(await state()).ambient}`);
  expect(want !== "file" || !seen.has("procedural"), `the built-in bed played before the file: ${[...seen].join(" -> ")}`);
  await page.getByRole("switch", { name: "Ambient atmosphere" }).click();
  expect((await state()).ambient === "off", "ambient should stop");
});

await step("a hidden tab suspends audio and refuses sounds; showing it again resumes", async () => {
  const setHidden = (hidden) => page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", { value: h ? "hidden" : "visible", configurable: true });
    Object.defineProperty(document, "hidden", { value: h, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
  await setHidden(true);
  await page.waitForTimeout(600);
  const hidden = await state();
  expect(hidden.hidden === true && hidden.context === "suspended", `expected hidden and suspended, got ${JSON.stringify(hidden)}`);
  await sounds(() => goto("The Archive"), []);
  await setHidden(false);
  await page.waitForTimeout(400);
  const shown = await state();
  expect(shown.hidden === false && shown.context === "running", `expected visible and running, got ${JSON.stringify(shown)}`);
  await sounds(() => goto("Keeper's Room"), ["ui.navigate"]);
});

await step("with interaction sounds off, actions are silent again", async () => {
  await page.getByRole("switch", { name: "Interaction sounds" }).click();
  await sounds(() => goto("The Archive"), []);
  await sounds(() => page.locator(".floating-add").click(), []);
  await page.keyboard.press("Escape");
  await goto("Keeper's Room");
});

await step("the Sound test panel plays every sound, even with interaction sounds off", async () => {
  await page.locator(".sound-test summary").click();
  const buttons = page.locator(".sound-test-play");
  const count = await buttons.count();
  expect(count === 17, `expected 17 Play buttons, got ${count}`);
  await clear();
  for (let i = 0; i < count; i++) { await buttons.nth(i).click(); await page.waitForTimeout(90); }
  const played = await log();
  const events = [...new Set(played.map((e) => e.event))];
  expect(events.length === 17, `expected all 17 events, got ${events.length}: ${events.join(", ")}`);
  expect(played.every((e) => e.forced === true), "previews with sound off should be marked forced");
  const wrongSource = played.filter((e) => e.source !== EXPECTED_SOURCE[e.event]).map((e) => `${e.event}:${e.source}`);
  expect(wrongSource.length === 0, `played the wrong source (expected per sound-map.ts): ${wrongSource.join(", ")}`);
  expect(/Ambient room \(loops\): playing/.test(await page.locator(".sound-test-status").innerText()), "status line did not report the preview");
  const badges = await page.locator(".sound-test-row").evaluateAll((rows) => rows.map((r) => [r.querySelector("code").textContent, r.querySelector(".sound-test-badge").textContent]));
  const wrongBadge = badges.filter(([event, badge]) => badge !== (EXPECTED_SOURCE[event] === "file" ? "Your file" : "Built-in")).map(([e, b]) => `${e}=${b}`);
  expect(badges.length === 17 && wrongBadge.length === 0, `badges that disagree with sound-map.ts: ${wrongBadge.join(", ")}`);
});

await step("exactly one AudioContext for the whole session", async () => {
  expect((await contexts()) === 1, `AudioContexts created: ${await contexts()}`);
  expect((await state()).contexts === 1, "engine reports more than one context");
});

await step("the debug log holds event names only, no commitment text", async () => {
  const text = JSON.stringify(await log());
  expect(!/Fibre|Sound test item|R899/.test(text), "commitment text leaked into the sound log");
});

await step("no console errors or page errors", async () => {
  expect(problems.length === 0, problems.slice(0, 3).join(" | "));
});

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nAll sound steps passed." : `\n${failures} step(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
