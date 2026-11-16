# Release checklist

Prepared 13 November 2026 (Prompt 8). Every line is either backed by evidence or marked open. A box is ticked only when the evidence named next to it exists. Nothing here has been submitted.

## 0. Rules and dates (checked against the official rules on 13 November 2026)

Source: https://kiroween.devpost.com/rules (fetched and read on 13 November 2026). Re-read it again just before submitting.

| Item | Rule | Status |
|---|---|---|
| Submission period | 30 Oct 2026, 9:00 am PT to **4 Dec 2026, 2:00 pm PT** | In the period today. |
| Deadline in South Africa (SAST, UTC+2) | 2:00 pm PT is 22:00 UTC, which is **Saturday 5 Dec 2026, 00:00 SAST** | Confirmed by conversion. Use an earlier internal freeze. |
| Judging period | 16 Dec 2026 to 29 Jan 2027 (1:00 pm PT) | The demo must stay free and reachable until it ends. |
| Category | Costume Contest ("a haunting user interface that's polished and unforgettable") | Chosen. |
| Kiro credits | One-time 4,000 credits through the Credit Request Form | The brief gives 1 Dec 2026, 12:00 pm PT as the request cut-off; I could not find that date on the rules page, so check the form itself. |
| Edits after the deadline | Not allowed, apart from limited fixes for third-party marks, personal data, etc. | Submit early. |

## 1. Required submission items

| # | Requirement (official rules) | Status | Evidence / what is missing |
|---|---|---|---|
| 1 | Built using Kiro. "Insufficient use of Kiro will result in disqualification." | **At risk** | Real use is listed in `docs/KIRO-USAGE-LOG.md`. Hooks have not fired, no MCP, no Powers, only one custom agent has run once, and Kiro's spec task runner has not been used. See section 3. |
| 2 | URL to a functional application; login details if needed | **Open** | Owner will self-host on a homelab (Docker image ready and tested locally). No public URL yet. No login is needed (local-first), so no credentials are required. |
| 3 | Text description of features | **Open** | Draft material: README "Current build" and `docs/PRODUCT-STATUS.md`. Write it for Devpost last. |
| 4 | Demo video under 3 minutes, public on YouTube, showing the real app, no third-party trademarks or copyrighted music | **Open** | Not recorded. Script: `docs/DEMO-SCRIPT.md`. |
| 5 | Public GitHub repository (not GitLab or Bitbucket) | **Done** | The GitHub API reports `github.com/Katleho-codes/the-haunt` as public, with licence MIT detected (checked 14 Nov 2026). |
| 6 | Source, assets and instructions to run | Done in the repo | README "Run locally" and "Verify". Fonts are fetched from Google at build time (needs internet on `npm run build`). |
| 7 | Open source licence file, detectable and visible at the top of the repo page (About) | Partly | `LICENSE` (MIT) is committed. Whether GitHub shows it in About can only be checked once the repo is public. |
| 8 | `/.kiro` at the repo root, not in `.gitignore` | Done | `.kiro/` is tracked (45 files); `git check-ignore .kiro` finds nothing; `.gitignore` has no `.kiro` entry. |
| 9 | Category and bonus categories identified | Open | Costume Contest. Bonus prizes only if genuinely eligible (see section 6). |
| 10 | Write-up of how Kiro was used | Draft | `docs/KIRO-WRITEUP-DRAFT.md`, written only from the usage log. Must be updated if more Kiro work is done. |
| 11 | Project built during the submission period; disclose pre-existing work | Needs the owner | First commit is 13 Nov 2026 11:39 SAST, inside the period. The brief says the initial scaffold was generated with ChatGPT outside Kiro. That is now disclosed in the README and the usage log; confirm the wording and that nothing older than 30 Oct 2026 is included. |
| 12 | Free access for judges until judging ends | Open | Needs a stable public address on the homelab until 29 Jan 2027 (section 4). |

## 2. Engineering checks (as of the last full run, 13 November 2026, commit `f02b2c0`)

| Check | Result | How to re-run |
|---|---|---|
| Typecheck | Pass | `npm run typecheck` |
| Lint | Pass: 0 errors, 1 `<img>` warning | `npm run lint` |
| Unit and property tests | Pass: 181 tests, 13 files | `npm test` |
| Production build | Pass | `npm run build` |
| Browser smoke test (Edge, local production build) | Pass: 30 steps | `npm run e2e` (server on port 3100) |
| Contrast audit | Pass: 664 text elements (gradients approximated) | `node e2e/contrast.mjs` |
| Screenshots, overflow and tap targets at 390/768/1280 px | Pass | `node e2e/screenshots.mjs` |
| E2E against the Docker container on localhost | Pass: 30 steps | `node e2e/smoke.mjs http://localhost:3200` |
| E2E on the **public** address | **Not run: no public address yet** | `node e2e/smoke.mjs https://<url>` |
| Chrome, Firefox, Safari, real phone, screen reader | **Not tested** | manual |
| Security headers (CSP etc.) | **Not set** | see section 4 |
| CI | **None** | optional |

## 3. Kiro evidence: what is real and what is not

- Real: Kiro IDE agent sessions (Vibe) for every build step; the `introspect` sub-agent for checking Kiro's file formats; the `quality-guardian` custom agent run once for the independent review (`docs/REVIEW-2026-11-13.md`); steering files loaded into the agent's context; specs written and kept up to date as the design changed; property-based tests with fast-check.
- Configured but never exercised: the hook `post-task-verify` and the typecheck-on-save hook (no recorded run of either); the `domain-engineer` and `experience-engineer` agents (never run).
- Not used: Kiro's spec task runner, MCP servers, Powers, Kiro CLI, Kiro Web, Kiro Crew.
- Nothing may be described as used until it is. If the owner wants a stronger Kiro story before the deadline, the honest options are to do real work that way, for example: run remaining spec tasks through Kiro's task runner so the hook fires, give a bounded task to `domain-engineer` or `experience-engineer`, or connect a Playwright MCP server for the browser checks. Do it only if it does real work, then log it with evidence. Screenshots of a Kiro run (task runner, hook output, agent run) should be saved under `docs/evidence/`.

## 4. Deployment plan (container ready; not yet running anywhere public)

Owner decision (13 Nov 2026): **the owner hosts it on their own homelab.** A `Dockerfile`, `.dockerignore` and `docker-compose.yml` are in the repo.

Verified on 13 Nov 2026, on the developer machine:
- [x] `docker build` succeeds (after the lockfile fix below) and the image is about 335 MB.
- [x] The container runs read-only, with all capabilities dropped and `no-new-privileges`, as uid 1001, and reports healthy.
- [x] `node e2e/smoke.mjs http://localhost:3200` against the **container**: 30 of 30 steps pass.
- [x] `docker compose config` validates.
- [x] 14 Nov 2026: ports changed to frontend 3009 and backend 8009, and services renamed `haunt-web` / `haunt-api` to match the homelab. On Docker Desktop: `scripts/check-isolation.ps1` passes 16/16, and `node e2e/smoke.mjs http://localhost:3009` passes 34/34 against the container. `deploy/homelab/docker-compose.haunt.yml`, merged with a homelab-style compose file and a Caddy using `Caddyfile.haunt`, was also tested. Caddy served the app for `haunt.lsquared.org.za` and returned 404 for `/api/health`. Caddy and another app on `homelab` could not resolve or reach `haunt-api`, and neither port was published. Not yet run on the real homelab or through the Cloudflare tunnel.
- [x] `docker compose --profile backend up --build` runs both containers on Node 24; the web container and the placeholder API both report healthy, and the 30-step browser test passes against that stack.
- [x] Hidden API: `scripts/check-isolation.ps1` passes 16 of 16 checks on Docker Desktop for Windows (API publishes no port, internal-only network, not reachable from the host, token required, no internet or host access from the API, token not in any browser output). There is no real backend yet; `apps/api` is a placeholder.
- Not verified: the isolation checks on a Linux host, ARM builds, behind a reverse proxy, from another machine, and over HTTPS.

Lockfile note: `npm ci` inside the Linux image failed because the lockfile (written on Windows) lacked two optional packages (`@emnapi/core`, `@emnapi/runtime`). The lockfile was regenerated with `npm install --package-lock-only` inside a Node 22 container; `npm ci --dry-run` still works on the Windows host.

Still open, and needs the owner's homelab:

- [ ] Run the container on the homelab and give it a stable address that stays up until 29 Jan 2027, reachable by judges **from the public internet**. A home connection normally needs a reverse proxy or tunnel with HTTPS and a domain; this is your decision and setup. A free, always-reachable address also matters for the rules ("free of charge and without any restriction", until the judging period ends).
- [ ] Consider uptime risk (power, ISP, dynamic IP, router updates) for a 6-week judging window; keep a second copy ready (for example a free static host) if the homelab goes down.
- [ ] Add security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`, frame restrictions) at the proxy or in `next.config.ts`, and test them in a browser first, because Next injects inline scripts. Do not ship a CSP that has not been run.
- [ ] Run `node e2e/smoke.mjs https://<public url>` against the real address and keep the output in `docs/evidence/`.
- [ ] Open the URL in a clean browser profile and on a phone, on mobile data (not your home wifi).

Original checklist, still applicable:

- [ ] Choose how the app is reached (see above).
- [ ] Node 20.9+ for local builds (22 recommended, `.nvmrc` exists); the image uses Node 24.
- [ ] Check that the font download at build time works wherever the image is built.
- [ ] Confirm no login is needed, no cost, and the URL is stable until 29 Jan 2027. Do not rename the project or delete the deployment after submitting.
- [ ] Judge instructions (also in the README): open the URL, press "load fictional demo data" in the empty-state banner or in The Keeper's Room, follow `docs/DEMO-SCRIPT.md`. To reset: Keeper's Room, Delete all my data. Data lives in the judge's own browser only.

## 5. Open product and quality items

From `docs/REVIEW-2026-11-13.md`, not yet done:

- [x] M-5 text size. Owner approved a floor of 11px mono and 12px body on 14 Nov 2026; `node e2e/text-size.mjs` checks it (2776 elements pass).
- [ ] M-6 failed saves and two tabs overwriting each other.
- [ ] M-7 timezone and locale settings in The Keeper's Room.
- [ ] M-8 an overdue repeating item needs one click per missed period (needs a product decision).
- [ ] L-8 no warning for past or multiple dates in a note.
- [ ] Data import (export exists).
- [ ] Series edit scopes, pause, monthly recurring-amount summary.
- [ ] Red used outside warnings has not been reviewed line by line (spec task 6.8).
- [ ] `docs/ARCHITECTURE.md` and `docs/KIRO-WORKFLOW.md` still describe a few things loosely; reread before release.

Brief "Must Have" items that are knowingly **not** met, by the owner's scope decision of 13 Nov 2026 (server side comes later): server-backed storage and accounts, reminders when the app is closed, a deployed demo with a stable backend. The public description and the video must not imply any of these exist.

## 6. Legal, assets and wording

- [x] `LICENSE` is MIT, copyright 2026 Katleho Mabala (confirm the name you want shown).
- [x] Font licence texts (SIL OFL 1.1) are in `docs/licenses/`. Fonts are bundled by `next/font` at build time.
- [ ] Icon: confirm who made `public/haunt-icon.svg` and `public/haunted-manor.svg` (the register says original to the project; the owner must confirm).
- [ ] Product name "THE HAUNT": the trademark mark was removed from the UI; name clearance has not been done. The owner decides whether to keep the name.
- [ ] Video: use no unlicensed music or third-party marks. The app's own synthesized sound is original. Do not show real personal data; use the fictional demo data.
- [ ] No secrets in the repo: `.env.example` holds placeholders only (re-check with a search before publishing).
- Bonus prizes: Blog (must be public, published during the period, and mention Kiroween 2026), Social Blitz (post must start with `#KiroweenHackathon26`), Best Demo (depends on ranking). Student, Startup, Ghost of Kiroween Past and Kiro Crew: only if genuinely eligible; none is claimed here.

## 7. Final steps, in order

1. Decide the open items above (host, name, M-7, how much more real Kiro work to do).
2. Make the repository public; confirm the licence shows in About.
3. Deploy; run the e2e script against the live URL; fix what it finds.
4. Record the video from the live URL (under 3 minutes); upload to YouTube as public; watch it logged out.
5. Update `docs/KIRO-USAGE-LOG.md`, then the write-up from it.
6. Re-read the official rules; fill the Devpost form; save a draft.
7. Submit at least 24 hours before 4 Dec 2026, 2:00 pm PT.
8. Do not change or take down the deployment until 29 Jan 2027.
