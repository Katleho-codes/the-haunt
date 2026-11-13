# THE HAUNT

> Keep life's loose ends from coming back to haunt you.

THE HAUNT is a cinematic, horror-inspired personal commitments manager. This repository is the first working local-first prototype for Kiroween 2026 (Costume Contest).

## Current build

The current prototype includes:

- A responsive haunted-mansion dashboard and navigation.
- Local commitment creation, editing, completion, restoration and deletion.
- Categories, due dates, recurrence selections, amounts and reminder preferences.
- A recurring commitments view, completed-items view and search.
- Quick text capture with a **deterministic local parser** for common dates, recurring phrases, currencies and categories.
- An editable review step before captured data is saved.
- Original synthesized interaction tones and a low ambient tone using the Web Audio API. Sound is off by default.
- Sound and reduced-motion preferences.
- Browser-local persistence and JSON export.
- Kiro steering, feature specs and a quality-check hook scaffold.

## How this project was made (disclosure)

The repository was assembled on 13 November 2026, inside the Kiroween 2026 submission period. Its **initial scaffold was generated with ChatGPT assistance outside Kiro** (first commit `4ef06ab`). All later work (domain model, recurrence, reminders, capture review, the cinematic layer, tests, browser checks, an independent review and its fixes) was done in Kiro IDE agent sessions. What Kiro was and was not used for is recorded in [`docs/KIRO-USAGE-LOG.md`](docs/KIRO-USAGE-LOG.md); hooks, MCP and Powers have not been used, and Kiro's spec task runner was not used. Standard open-source libraries are used (Next.js, React, Zod, Lucide, Vitest, fast-check, playwright-core).

## Try it as a judge

No login is needed. Open the app, then press **load fictional demo data** (in the empty-state banner or in The Keeper's Room). A suggested walk-through is in [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md). Everything stays in your own browser. To reset, use **The Keeper's Room → Delete all my data**. Deployed URL: _not yet deployed_.

## Important prototype boundaries

This is not yet the full production product. No backend, authentication, cloud synchronisation, PostgreSQL, Redis, BullMQ, scheduled delivery, browser push, connected LLM, OCR, or voice transcription is implemented. The capture parser is deterministic and runs locally; it is **not AI**. The UI clearly labels this boundary. Reminders are in-app only: they become due at a chosen time of day and appear in the notification centre while THE HAUNT is open. They are not delivered by email, push or text message, and nothing runs in the background.

Nothing is stored until you add something. Fictional demo commitments load only when you choose "Load fictional demo data", and can be deleted at any time.

## Requirements

- Node.js 22 or newer (24 recommended; Next.js 16 needs at least 20.9, but Node 20 reached end of life on 30 April 2026)
- npm 10+

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Browser checks (need Chrome or Edge; set `E2E_CHANNEL=chrome` for Chrome, default is Edge):

```bash
npm run build
npx next start -p 3100
# in a second terminal
npm run e2e                    # end-to-end smoke test
node e2e/contrast.mjs          # text contrast audit (WCAG AA)
node e2e/screenshots.mjs       # screenshots at 390, 768 and 1280 px, overflow and touch-target check
```

## Self-hosting with Docker

The repository includes a `Dockerfile` (multi-stage, Node 24 Alpine, runs as an unprivileged user, has a health check) and a `docker-compose.yml` for a home server.

```bash
docker compose up -d --build        # then open http://<host>:3200
HAUNT_PORT=8080 docker compose up -d   # use another port
docker compose logs -f
docker compose down
```

Or without Compose: `docker build -t the-haunt .` then `docker run -d -p 3200:3000 --read-only --tmpfs /tmp the-haunt`.

Notes:

- The first build needs internet access: `next/font` downloads the three Google fonts and bundles them into the image, so visitors' browsers never contact Google.
- The container stores nothing and needs no environment variables, database or secrets. Each visitor's data stays in their own browser (see `docs/PRIVACY-NOTES.md`).
- If it is reachable from outside your network, put a reverse proxy with HTTPS in front of it. The app does not set a Content-Security-Policy or other security headers yet; add them at the proxy or in `next.config.ts` after testing in a browser.
- The browser smoke test can be pointed at the container: `node e2e/smoke.mjs http://localhost:3200`.
- Image size is about 335 MB. Pin the base image by digest in the `Dockerfile` if you need repeatable builds.
- Node 24 is the current Active LTS (Node 22 is in maintenance until 30 April 2027; Node 20 reached end of life on 30 April 2026). To build on another version: `docker build --build-arg NODE_VERSION=22 .`.

### A hidden backend (optional, nothing uses it yet)

There is **no backend yet**: today the app is local-first and the web container is all it needs. The compose file already lays out where a backend will live so it is never exposed:

```text
browser --> web container (the only published port) --> api container (internal network only)
```

- The `api` service is behind the `backend` compose profile, so `docker compose up` does not start it. Start it with `docker compose --profile backend up -d --build` after setting `API_TOKEN` in a `.env` file (see `.env.example`).
- It publishes no port, sits on a Docker network marked `internal: true` (no internet, no route to the host), and only the web container is attached to that network.
- Only the web container's server code should call it, at `http://api:4000`, with `Authorization: Bearer $API_TOKEN`. The token is server-side only and must never be a `NEXT_PUBLIC_*` variable.
- `apps/api` is a **placeholder with no features** (it answers `/health` and refuses everything else). It exists to prove the isolation, not to be described as a backend. `scripts/check-isolation.ps1` runs 16 checks against the running stack.

## Data storage

Commitments, completion history, reminder records and preferences are stored in `localStorage` in the current browser. Nothing is sent anywhere.

- **Export:** Keeper's Room → Export my data saves all of the above as a JSON file. There is **no import yet**.
- **Delete:** Keeper's Room → Delete all my data removes everything this app stored in the browser, including corrupt-data backups and any copy from the earlier prototype.
- Clearing browser storage also removes the data. There is no cloud copy.

## Licence

MIT. See [LICENSE](LICENSE). Fonts (Cormorant Garamond, DM Sans, IBM Plex Mono) are used under the SIL Open Font License; see `docs/ASSET-REGISTER.md`.

## Kiro workflow

Open this folder as the workspace in Kiro. Start by reviewing:

- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/visual-design.md`
- `.kiro/specs/`

The specs describe the next engineering increments. Use Kiro's Spec workflow to refine the requirements/design/tasks with the actual codebase, then implement and record the work through Kiro. Do not claim that work done outside Kiro was generated by Kiro.

## Product direction

South Africa is the initial context (ZAR, local date formatting and common household obligations), but currencies, locale and timezone must remain configurable. The project must work after Halloween: the supernatural visual language is a product identity, not a seasonal landing page.
