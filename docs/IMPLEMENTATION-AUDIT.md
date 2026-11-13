# Implementation audit

**Date:** 13 November 2026
**Scope:** Prompt 0 in `KIRO-MASTER-BRIEF.md`. Audit only. No application code was changed.
**Method:** Read the brief, README, `docs/`, `.kiro/` and source. Ran the available checks. Probed the capture parser directly with a small Node script (not saved to the repo).

## 1. Checks that actually ran

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` (`node --test scripts/capture.test.cjs`) | Passed, 4 of 4 |
| `npm run build` | Passed (Next.js 16.4.6, Turbopack). Routes `/` and `/_not-found` prerendered as static |
| `npm run lint` | **Failed**: 9 errors, 2 warnings |

Lint errors:
- `components/haunt-app.tsx`: `react-hooks/set-state-in-effect` (hydration effect at ~line 117) and `react/no-unescaped-entities` at lines 294, 305, 311.
- `scripts/capture.test.cjs`: `no-require-imports` (5 errors). The lint config does not accommodate CommonJS test files.
- Warnings: `<img>` instead of `next/image` (line 266) and one more.

Not run: browser automation, accessibility tooling, responsive checks at real viewports, audio playback, PWA install. Those findings below are from reading code and CSS only, and are marked as unverified.

## 2. Repository facts

- **Not a git repository** (`git status` fails). Nothing is committed or tracked. The competition steering requires `.kiro/` to be committed and a public repo to exist.
- **No LICENSE file.** Competition rules require a visible open-source license.
- `.gitignore` does not ignore `.kiro/`. Good.
- Single-page app. One 300+ line client component (`components/haunt-app.tsx`) holds state, persistence, audio, views, modal and rows, with very long single-line JSX. This conflicts with the structure steering (domain logic out of components, focused components).
- Dependencies are unpinned (`^`). The tech steering asks for exact or pinned versions.

## 3. Verified implementation (read and, where noted, run)

- App shell, five views (Hall, Archive, Clocktower, Crypt, Keeper's Room), mobile nav drawer, toast, modal with Escape handling and `role="dialog"`. Build passes; rendering in a browser was not verified.
- Create, edit, delete, complete and restore of commitments, held in React state.
- Persistence: `localStorage` under `STORAGE_KEY` and `SETTINGS_KEY`. JSON export button exists. Local only, single browser, no schema versioning. Corrupt JSON falls back to seed data via `try/catch`.
- Deterministic capture parser (`lib/capture.ts`), covered by 4 passing tests.
- Visible focus style (`:focus-visible`, spectral outline) for buttons and inputs.
- Design tokens and fonts named in steering exist in CSS (token file not audited line by line).

## 4. UI-only or scaffolded

- **Recurrence:** a `recurrence` field and a label. Completing a recurring item sets `status: "completed"` and does **not** create the next occurrence (`completeCommitment`). No series/occurrence model. `nextOccurrence()` in `lib/date-utils.ts` uses `setMonth` / `setDate` on local `Date`, so it is calendar-aware only by accident and has no month-end policy (31 Jan + 1 month becomes early March). It is a display helper, and I found no evidence it drives anything.
- **Reminders:** `reminders: number[]` (days before) is stored. Nothing schedules, fires or displays them. No notification centre, no snooze, no `Notification` API use, no delivery states.
- **Voice and files:** buttons labelled "Voice soon" and "Files soon". Types allow `source: "document" | "voice"` but nothing produces them.
- **PWA:** `manifest.webmanifest` and the metadata link exist. No service worker, no offline shell, no install prompt. Only an SVG icon with `purpose: "any maskable"` (many platforms need PNG 192/512 icons; unverified).
- **Monthly summary:** a stat card sums amounts of items due in the next 7 days (`upcomingTotal`) and adds amounts across currencies without separating them. This breaks the brief rule "never combine currencies" (section 5.7).
- **Environment states** (Calm / Watchful / Restless): only a restless count is computed. The three-state model is not implemented.
- **Accounts/profile:** "The Keeper" avatar is static. No user concept.

## 5. Incomplete or incorrect (confirmed by running the parser)

| Input | Result | Problem |
|---|---|---|
| `Dentist for 3 weeks, call before 5pm` | amount `3` | The money regex matches a bare `r` inside "for" followed by a digit, so a false amount is produced. |
| `Pay rent on the 31st every month` | due 28 Nov, confidence **high** | The day is silently clamped to 28 and reported with high confidence. Violates "do not invent" and the brief's documented month-end policy requirement. |
| `Vehicle licence expires in March` | no date, low | Correct behaviour. |
| `Gym R350 monthly on 25 November` | 25 Nov, 350, monthly | Correct. |

Other gaps:
- Dates are built as local `Date` at 12:00 and stored as ISO UTC strings (`dueAt`). The brief requires date-only values and a user timezone. A date entered near midnight in a non-UTC zone can display on a different day. `isSameDay` and `dayDiff` use the browser timezone, not a stored user timezone. No DST handling.
- `Commitment.amount` is a floating-point major-unit number; the brief requires integer minor units plus a required currency when an amount exists.
- No `proposal` schema validation (no Zod), no `needsReview` list, no per-field confidence. Confidence is one coarse label. The parser does not recognise "the 25th" unless "monthly" is also present.
- `JSON.parse` of stored data is cast to `Commitment[]` without validation.
- Export includes data and settings, but there is no import and no "delete all my data" action (verify in Keeper's Room UI before claiming).
- Archive status exists in types, but I found no UI to archive.
- Type and category enums differ from the brief (`payment` vs `bill`, no `study`/`membership`/`custom`).
- Only two lint-visible accessibility labels were checked. Not verified: row menu keyboard behaviour, modal focus trap and focus return, `⌘ K` shortcut (the search button toggles a panel; no key handler found in my grep), contrast on muted text.
- Search toolbar and filters: text search only. No category/status/date filters or sort.
- No `.ics`, no ledger, no pause/archive for series.

## 6. Unverified behaviour

- **Audio:** code uses `AudioContext`, defaults are said to be off. I did not test playback, volume control (no volume slider found), the separate ambience/effects toggles in the UI (only an effects toggle was seen in the top bar), or the Easter egg. No cap on gain was reviewed.
- **Reduced motion:** the only mechanism is a manual setting that sets `data-reduce-motion` on `<html>`. There is **no `@media (prefers-reduced-motion)`** rule, so users who set it at OS level get full animation until they toggle it in the app. Also, the attribute is set in an effect after hydration.
- **Responsiveness:** breakpoints exist at 1500, 1180, 940, 700 and 390 px. Not tested in a browser.
- **PWA, mobile install, offline:** not implemented or tested.
- **Backend:** none. No API, database, auth, queue, worker or AI provider. `.env.example` lists `DATABASE_URL`, `REDIS_URL`, `AI_EXTRACTION_API_KEY` as future placeholders only (contains a default dev password in the example URL; harmless but note it).
- **Tests:** only the parser tests. They compile the TS source with an in-test transpile shim, so they cover only `lib/capture.ts`. They depend on the current date (one test builds expectations from `new Date()`), and the first test's date assertion could be flaky across month boundaries. No tests for dates, recurrence, money, persistence, or UI. No CI.
- **Kiro usage:** `.kiro/` contains steering (7 files), 3 custom agents, 1 hook (typecheck on `.ts/.tsx` save), and 3 specs (`core-experience`, `intelligent-capture`, `visual-atmosphere`). These are configuration. I have no evidence in the repo that any spec task, hook run or agent run happened. `docs/KIRO-WORKFLOW.md` says the same. Do not claim Kiro-generated code on the strength of these files.
- The hook, agent front matter and spec files were not validated against Kiro's current schema (that is Prompt 1).

## 7. What can be reused

- Visual system, layout, CSS tokens, SVG assets (provenance still to be confirmed in `docs/ASSET-REGISTER.md`).
- View structure and navigation naming.
- `capture.ts` as the deterministic parser baseline, after fixing the defects above and wrapping it behind a `CommitmentProposal` schema.
- Steering files and the three agents as a starting point.
- The Web Audio sound approach (original synthesized tones, no third-party samples).

## 8. Smallest safe path to the MVP

1. Put the repo under git, add a LICENSE, commit `.kiro/`. Fix lint so the checks can gate work.
2. Define the domain model: date-only `dueDate`, optional `dueTime`, `timezone`, `amountMinor` + `currency`, validated with a runtime schema. Add a repository interface over `localStorage` with a versioned migration for existing data.
3. Recurrence engine in `lib/` as pure functions, with month-end policy, leap years, DST, idempotent occurrence generation, example and property-based tests. Make completing a recurring item advance it correctly.
4. Reminders: derive in-app reminders from the repository, build a notification centre with snooze and dismiss, and label it as in-app only. Decide whether a real backend is feasible before the 4 December deadline; if not, state in the README and demo that reminders are in-app while the tab is open or when the app is next opened.
5. Capture: introduce `CommitmentProposal` + `needsReview`, fix parser defects, keep it labelled deterministic. Only add an LLM adapter if time and consent UI allow.
6. Fix the monthly summary to group by currency, add `prefers-reduced-motion`, complete the settings (separate ambience/effects, volume), add data deletion and import.
7. Split `haunt-app.tsx` into focused components and move state/persistence out.
8. Browser-automation pass on the signature demo journey, then deploy.

Deployed backend (NestJS, PostgreSQL, Prisma, Redis, BullMQ) is a large step. With about three weeks to the submission deadline, I recommend a decision from the product owner on whether the MVP is "local-first with honest in-app reminders" or "server-backed". See section 10.

## 9. Risks

- **Honesty risk:** the brief's "Must Have" list includes real reminder delivery, server-backed storage, export and deletion, and a public deployment. Current state does not meet these. The README is accurate about this; keep it that way.
- **Time risk:** deadline for submission is 4 December 2026. Backend plus worker plus auth is likely not feasible alongside recurrence, reminders, capture and polish.
- **Data correctness risk:** timezone and float-money issues above will corrupt data once users have real entries. Migrate before adding features.
- **Repo risk:** no git history means no evidence of work during the submission window (30 October to 4 December 2026) and no way to show Kiro usage.
- **Privacy:** current data is local only, which is favourable. Any AI or OCR addition needs consent UI first.

## 10. Decisions for the product owner

1. Local-first MVP with in-app reminders, or server-backed MVP? (Affects almost every spec.)
2. Which single external reminder channel, if any: browser push, email, none?
3. Is an LLM extraction adapter in scope, or does the demo present the deterministic parser honestly as such?
4. Which open-source license?
5. Confirm product name clearance for "THE HAUNT" (the UI shows a ™ mark; do not keep it without clearance).
6. Confirm provenance of `haunted-manor.svg` and `haunt-icon.svg`.

## 11. Proposed specs (for Prompt 1)

`product-foundation`, `commitment-domain`, `recurrence-engine`, `reminders-and-notifications`, `intelligent-capture` (refine existing), `cinematic-experience` (supersedes `visual-atmosphere`), `pwa-and-mobile`, `privacy-and-security`, `release-and-demo`. The existing `core-experience` spec should be folded into `product-foundation` and `commitment-domain`.

## 12. Scope conflicts noted

- Brief section 4.1 expects server-backed storage and a real reminder path; README and architecture docs describe a local prototype. Section 10 decision 1 resolves this.
- `product.md` forbids payments and banking; the app's "payment" category and amount display are fine, but wording must continue to say amounts are user-entered.
- ARCHITECTURE.md lists NestJS and PostgreSQL as intended; nothing in the repo supports them yet.

## 13. Limits of this audit

I read `lib/*`, `app/layout.tsx`, `package.json`, docs, Kiro folder listings, one agent and the hook. I read `components/haunt-app.tsx` and `app/globals.css` through targeted searches and not line by line, so UI findings flagged "not verified" may be incomplete. I did not open the three spec files, the other two agent files, `seed.ts`, or the asset register.
