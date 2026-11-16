# Kiroween 2026 submission: THE HAUNT

Draft for the Devpost form, written 14 November 2026. Every claim below is backed by the repository, `docs/KIRO-USAGE-LOG.md` or a test run. Lines marked **OWNER** need your input before you paste them.

## Before you submit (not done yet)

| Requirement | Status |
|---|---|
| Public GitHub repo with an open-source licence shown in About | **Done.** The GitHub API reports the repo as public with licence MIT (checked 14 Nov 2026). |
| `/.kiro` at the root and not ignored | **Done.** 45 files tracked: 7 steering files, 11 specs, 3 custom agents, 2 hooks. |
| Source, assets and setup instructions | **Done.** See the README ("Run locally", "Self-hosting with Docker") and `deploy/homelab/README.md`. |
| Working app URL | **Open.** `haunt.lsquared.org.za` does not resolve yet (checked 14 Nov 2026). Deploy it, then run `node e2e/smoke.mjs https://haunt.lsquared.org.za`. It must stay up until 29 Jan 2027. |
| Demo video: public on YouTube, under 3 minutes | **Open.** Not recorded. Script: `docs/DEMO-SCRIPT.md`. Use the fictional demo data and no third-party music. The app's sounds come from Pixabay under its licence, so they are fine to include. |
| Image gallery | **Open.** Screenshots in `docs/evidence/screenshots/` are 1280x900. Devpost suggests 3:2 (for example 1500x1000). Ask me to generate a 3:2 set if you want one. |
| Kiro write-up | Drafted below. Rule risk: "insufficient use of Kiro will result in disqualification". Hooks never fired, MCP and Powers were not used, and only one custom agent ran. Section 3 of `docs/RELEASE-CHECKLIST.md` lists honest ways to strengthen this before the deadline. |
| Re-read the official rules | **Open.** https://kiroween.devpost.com/rules, immediately before submitting. |
| Deadline | 4 Dec 2026, 2:00 pm PT = **5 Dec 2026, 00:00 SAST**. Submit at least a day early. |
| **OWNER** confirmations | (1) What the first commit `4ef06ab` contained and who made it. (2) Who drew `public/haunt-icon.svg` and `public/haunted-manor.svg`. (3) Attributions for 4 Pixabay files (IDs 472369, 103708, 206591, 15981). (4) Who wrote `KIRO-MASTER-BRIEF.md`. |

So the project is **not complete yet**. The code, repository and documentation are ready. The live URL and the video are still missing, and you need to confirm the four items above.

---

## Category and bonus prizes

- **Category:** Costume Contest.
- **Best Demo:** considered automatically.
- **Social Blitz / Bonus Blog:** only if you publish a post during the submission period. A social post must start with `#KiroweenHackathon26`; a blog post must say it was written for Kiroween 2026. Add the URLs.
- Startup, Student, Ghost of Kiroween Past and Kiro Crew: claim them only if you genuinely qualify. Nothing in the repository supports them.

---

## Project name

THE HAUNT

## Elevator pitch

Keep life's loose ends from coming back to haunt you. A personal ledger for bills, renewals and appointments, set in a candlelit Victorian manor.

## About the project

> **OWNER:** The "Inspiration" paragraph is a neutral draft. Replace it with your own reason for building this.

### Inspiration

Life admin keeps coming back: the fibre bill on the 25th, the school fees on the 1st, the vehicle licence that expires in March. Most reminder apps feel like spreadsheets, and they get ignored. THE HAUNT treats each unfinished commitment as a restless spirit in a house. The house grows uneasy as things become overdue and calms down once they're laid to rest. The horror theme is the visual language. It never gets in the way of the task: text sits on flat surfaces, sound is off until you turn it on, and reduced motion is respected.

### What it does

The house has five rooms:

- **The Hall:** what needs your attention now, the house's mood (calm, restless and so on) shown in words, and quick capture.
- **The Archive:** every commitment, with Active and Archived tabs and search.
- **The Clocktower:** repeating commitments, with the next three dates for each.
- **The Crypt:** completed commitments ("laid to rest"), with completion history and undo.
- **The Keeper's Room:** settings, sound and motion controls, export, fictional demo data and delete-all.

Features:

- **Quick capture with a review step.** Paste "My fibre bill is R899 and is due on the 25th of every month." A rule-based reader proposes the title, amount, currency, due date and repeat rule, then asks you to confirm. Unclear dates stay empty and are flagged. The reader also flags currencies written as words, and it doesn't mistake "2 pounds of sugar" for money. It is labelled as not AI, because it isn't.
- **Recurrence that handles real calendars.** Monthly, yearly and other repeats, including month-end and leap years, plus time conversion that stays correct across daylight-saving changes. Completing a repeating item records it in history and moves it to the next date.
- **In-app reminders.** A notification centre with snooze, dismiss and a clearly labelled test reminder. Reminders appear only while the app is open, and the app says so; it never claims a notification was delivered when it wasn't.
- **Money done carefully.** Amounts are stored in minor units, totals are kept per currency, and the default is ZAR with other currencies supported.
- **Atmosphere you control.** A drawing for each room (a pendulum clock, spirit wisps over a tombstone, a candlelit ledger shelf), completion effects and a mood that follows the house. Sound is off by default, with separate switches for ambience and interaction sounds. Motion can follow the device, be reduced or be full, and atmosphere intensity can be turned down.
- **Accessible.** Keyboard operation (Ctrl+K search, a focus-trapped dialog, keyboard row menus), named controls, visible focus, text contrast checked against WCAG AA, and a minimum text size.
- **Private by design.** No account. Everything stays in your own browser. Export and delete-all cover every stored record, including backups.

### How we built it

THE HAUNT was built in **Kiro IDE**, mostly in agent sessions driven by a staged brief: audit, configuration, domain, recurrence, reminders, capture, cinematic layer, independent review, release.

1. **Audit first.** The agent read the starting prototype, ran the checks and wrote `docs/IMPLEMENTATION-AUDIT.md`. Lint failed with 9 errors, and the text parser had real bugs.
2. **Steering and specs.** Steering files were given inclusion modes. Eleven specs were written with WHEN/SHALL requirements, a design and tasks, grounded in the audit rather than in wishes.
3. **Domain in `lib/`, not in components.** Zod-validated types, date-only dates, money in minor units, a storage boundary, a recurrence engine and a reminder planner, all free of React.
4. **Tests at every layer.** 258 unit and property tests (Vitest and fast-check). A 34-step browser test runs in Edge through playwright-core. Separate scripts check sound behaviour (13 steps), contrast, text size, screenshots at 390, 768 and 1280 px, and Docker network isolation (16 checks).
5. **An independent review.** A custom Kiro agent (`quality-guardian`) reviewed the build and found 3 high and 8 medium issues, such as archived items vanishing, unnamed toggle switches and delete-all leaving backups behind. They were fixed with regression tests.
6. **Self-hosting.** A multi-stage, non-root, read-only Node 24 Docker image. The future backend sits on an internal-only Docker network that only the frontend can reach. It runs behind Caddy and a Cloudflare tunnel on a homelab.

Stack: Next.js (App Router), React, TypeScript (strict), plain CSS, Lucide icons, Web Audio API, Zod, localStorage, Vitest, fast-check, playwright-core, Docker.

### Challenges

- **Dates are hard.** Daylight-saving gaps, the 31st in short months, leap years and "the 25th of every month" all needed explicit rules and property tests.
- **Honest states.** It is easy to write "Reminder sent". The product rule was to say only what actually happened, which shaped the reminder wording, the "not AI" label on capture and the scope of this write-up.
- **Atmosphere vs. usability.** The first contrast audit failed across the app, and mobile touch targets were 13 to 19 px. Later, screenshots showed list rows overflowing on phones and hiding the row menu. Each was fixed and is now guarded by an automated check.
- **Real audio files.** The Pixabay sounds varied a lot. Some effects ran 7.5 seconds, some started with half a second of silence, and one was ten times quieter than the rest. The engine now normalises loudness, trims leading silence, fades long sounds and reuses voices, so a burst of clicks never goes silent.
- **Keeping the backend private.** The API placeholder publishes no port and sits on an `internal: true` network. A script proves the host, the reverse proxy and other containers can't reach it, and that its token never appears in anything sent to the browser.

### What we learned

- Writing specs from an audit of the real code produced better tasks than writing them from the idea.
- An independent reviewer agent found problems the implementing agent had missed.
- Browser checks (accessible names, contrast, overflow) found more real defects than unit tests did.
- Writing down what was *not* done is as useful as listing what was.

### What's next

A server side: accounts, server-backed storage and reminders that arrive when the app is closed, built with NestJS, PostgreSQL and a background worker. Also data import, timezone and locale settings, and edit scopes for repeating series.

## Built with

`kiro` · `nextjs` · `react` · `typescript` · `css` · `svg` · `web-audio-api` · `zod` · `localstorage` · `lucide` · `vitest` · `fast-check` · `property-based-testing` · `playwright` · `eslint` · `nodejs` · `docker` · `caddy` · `cloudflare-tunnel` · `pixabay` · `self-hosted` · `accessibility`

(22 tags.)

## Project media

Suggested gallery, in this order:

1. The Hall at 1280 px.
2. Capture review dialog.
3. The Clocktower with its pendulum.
4. The Crypt.
5. Notification centre.
6. The Keeper's Room sound and motion settings.
7. Phone view of The Hall.

**OWNER:** pick from `docs/evidence/screenshots/`, or ask me for a 3:2 set.

## Public GitHub repo URL

https://github.com/Katleho-codes/the-haunt

## Working demo URL

https://haunt.lsquared.org.za (**not live yet**, see the table at the top)

## Testing instructions for judges

No login is needed and nothing is sent to a server. Your data stays in your own browser.

1. Open the URL. A fresh browser starts with an empty ledger.
2. Press **load fictional demo data** (in the empty-state banner or in The Keeper's Room).
3. Visit each room from the sidebar (on a phone, the menu button at the top left).
4. In The Hall, paste into quick capture: `My fibre bill is R899 and is due on the 25th of every month.` Review the proposal and save it.
5. Complete an item with the circle on the left of its row, then open The Crypt and undo it from the row menu (…).
6. Open the bell (top right) for the notification centre, and press **Send test reminder** at the bottom of it.
7. Sound is **off** by default. Turn on "Ambient atmosphere" and "Interaction sounds" in The Keeper's Room to hear it.
8. To reset: The Keeper's Room, then **Delete all my data**.

Reminders appear only while the app is open. This is a known limit of the local-first build.

## How the project meets the Kiro requirement

All work after the first commit was done in **Kiro IDE**. The full record, with evidence for each entry, is in `docs/KIRO-USAGE-LOG.md`.

- **Kiro IDE agent sessions (Vibe):** every build stage, including the audit, domain model, recurrence engine, reminders, capture, cinematic layer, sound system, UI polish, release docs and Docker. Each session ran the checks and recorded verification notes.
- **Plan mode:** the sound system was planned in Kiro's plan mode. The plan was agreed with me, saved as `docs/sound-system-plan.md` and ticked task by task as each check passed.
- **Specs (`.kiro/specs/`, 11 folders):** requirements with WHEN/SHALL acceptance criteria, a design and tasks for the product foundation, commitment domain, recurrence engine, reminders, capture, cinematic experience, PWA and mobile, privacy and security, and release and demo. Task notes say how each task was verified (unit test, browser test or audit), and the designs were updated when the code proved them wrong. Two older specs are marked superseded.
- **Steering (`.kiro/steering/`, 7 files):** product, tech, structure and security are always included. Visual design and testing load when matching files are in play, and competition loads on demand. They enforced rules like "sound off by default", "red only for real warnings", "never claim a reminder was delivered" and "keep date logic out of components".
- **Custom agents (`.kiro/agents/`):** `quality-guardian` (read-only reviewer) was run as a sub-agent and produced `docs/REVIEW-2026-11-13.md`. `domain-engineer` and `experience-engineer` are defined with path-limited permissions.
- **Sub-agents:** `introspect` checked Kiro's current file formats against kiro.dev before the agents, hooks and steering were rewritten.
- **Hooks (`.kiro/hooks/`):** `post-task-verify` (runs typecheck and tests after a spec task, created with Kiro's hook tool) and a typecheck-on-save hook.
- **Property-based testing:** fast-check properties for recurrence ordering, uniqueness, bounds and idempotence, month-end and leap years, daylight-saving round trips, reminder idempotence, money sums, the parser never producing an amount without a currency, and the house mood.

Not used: MCP servers, Kiro Powers, Kiro CLI, Kiro Web, Kiro Crew, and Kiro's spec task runner.

### Kiro write-up (longer version for the form or a blog)

**Which Kiro surfaces.** Kiro IDE only, in agent sessions (Vibe) with sub-agents and plan mode. I didn't use CLI, Web or Crew, so I can't compare them.

**Spec-driven development.** I didn't start with specs. I started with an audit. The agent read the prototype, ran the checks and listed what was broken. The specs were then written against that real code, with acceptance criteria a test can check, and each task records how it was verified. That gave the work a definition of done. It also made it easy to say plainly what wasn't built: import, series edit scopes and push notifications are left open on purpose. When the code showed a design was wrong, the design was changed. For example, only completed occurrences are stored, because upcoming ones can be derived. Most implementation still happened in conversational sessions with the specs as the contract. Kiro's spec task runner wasn't used, which is also why the post-task hook never fired.

**Steering.** The biggest difference came from a few hard, checkable rules rather than long style guides: sound off by default with separate switches, red only for real warnings, text on flat surfaces, never claim a reminder was delivered, keep date logic out of React components. Inclusion modes kept the always-on context small, and visual and testing rules loaded only when relevant files were open. The honesty rule shaped the product itself: the reminder states, the "not AI" label on capture, and this write-up.

**Custom agents.** I defined three agents with explicit resources and path-limited write access: a domain engineer for `lib/`, an experience engineer for components and CSS, and a read-only quality guardian. The quality guardian was run as an independent reviewer. It ran the checks, started the production server, probed the app with temporary scripts and wrote a review with 3 high, 8 medium and 8 low findings and a "not ready" verdict. Five findings were re-checked against the code, and all five were real. Most were then fixed with regression tests. The two engineer agents have not been run.

**Hooks.** Two hooks are configured: typecheck on save, and typecheck plus tests after each spec task. Neither has a recorded run, so I don't claim a workflow improvement from them.

**Property-based testing.** fast-check covers the parts where example tests miss edge cases: recurrence over arbitrary dates and rules, month-end and leap years, daylight-saving round trips, reminder planning being idempotent, per-currency sums, and the capture parser never inventing an amount without a currency. The properties passed when written. The log doesn't record a bug that only PBT found. The defects that *were* found came from the browser test, the accessible-name sweep, the contrast and text-size audits and the independent review. Many tests were confirmed by deliberately breaking the fix and watching them fail.

**MCP and Powers.** Not used. The browser checks call playwright-core directly from scripts.

## Pre-existing code and work

- **Initial prototype.** The first commit, `4ef06ab` ("Phase 0 and Phase 1, done", 13 Nov 2026 11:39 SAST, inside the submission period), was a Next.js prototype generated with ChatGPT assistance outside Kiro. It is not attributed to Kiro. Everything after it was done in Kiro IDE. **OWNER:** confirm which files it contained (app code, CSS, SVG art, `.kiro` drafts, `KIRO-MASTER-BRIEF.md`) and name them here.
- **Starter:** standard Next.js App Router setup. No other boilerplate or starter kit.
- **Libraries:** Next.js, React, Zod, Lucide React (ISC); dev tools Vitest, fast-check, playwright-core, ESLint, TypeScript.
- **Fonts:** Cormorant Garamond, DM Sans and IBM Plex Mono, under the SIL Open Font License 1.1 (texts in `docs/licenses/`), bundled at build time.
- **Audio:** 11 sound files from Pixabay under the Pixabay Content License (`public/audio/LICENSE-AUDIO.md`, credits in `docs/ASSET-REGISTER.md`). **OWNER:** 4 files still need matching attributions.
- **Artwork:** `public/haunt-icon.svg` and `public/haunted-manor.svg` (**OWNER:** confirm authorship). The room drawings in `components/room-motif.tsx` were drawn in code for this project.
