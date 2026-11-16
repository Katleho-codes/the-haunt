# Privacy notes

Written 13 November 2026 for the local-first build; public demo section added 16 November 2026. It describes what the code does today, not a legal policy. Have it reviewed before any real-user launch.

## What is stored, and where

Everything you enter is stored in the browser's `localStorage` on the device you use. There is no account, no app database, and the server keeps none of your data. The app itself contains no analytics or tracking code. The public demo sits behind Cloudflare, which collects its own domain-wide statistics (see "The public demo" below).

| Data | Key prefix | Notes |
|---|---|---|
| Commitments, completion history, reminder records, settings | `the-haunt.store.v1.<user>` | Titles, notes, amounts, dates. Reminder records hold ids, dates and states only, not titles or amounts. |
| Backup of unreadable data | `the-haunt.corrupt.<user>.<time>` | A raw copy kept if stored data could not be read, so nothing is silently lost. Removed by Delete all. |
| Copy from the earlier prototype | `the-haunt.commitments.v1`, `the-haunt.settings.v1` | Kept after migration as a backup. Removed by Delete all. |

## What leaves the device

Your data never leaves the device: commitments, notes, amounts, dates, history and settings stay in the browser. The app code makes no network requests while running, apart from loading its own files (pages, scripts, fonts, sounds) from the site it was served from. The browser test checks this and fails if any other request is made. Fonts are bundled at build time. Text you type into capture is read by code on your device. It is **not** sent to an AI service, and the review step says so.

## The public demo (haunt.lsquared.org.za)

The demo is self-hosted: the owner runs it on a home server (homelab) in Docker, behind the Caddy reverse proxy and a Cloudflare Tunnel. The app server only sends the app's files. It has no database, receives none of your data, and the Caddy setup in `deploy/homelab/` adds no request logging.

Cloudflare sits in front of the whole `lsquared.org.za` domain, so it applies to this site as it does to every other subdomain. This is standard domain-level monitoring by the owner, not analytics built into THE HAUNT:

- **Traffic and security statistics.** Every request passes through Cloudflare, which sees what any proxy sees: your IP address, the address requested, the time and your browser's user agent. Cloudflare uses this for domain-wide figures such as how many requests each address or subdomain received and how many threats or attacks it blocked.
- **Web Analytics beacon.** Cloudflare automatically adds its Web Analytics script (`static.cloudflareinsights.com/beacon.min.js`) to pages on the domain. It reports page views, the referring page, browser and country, and page-load performance (Core Web Vitals) back through the site's own address (`/cdn-cgi/rum`). Cloudflare states that it uses no cookies or localStorage for these metrics and does not fingerprint visitors ([Cloudflare Web Analytics](https://cloudflare.com/web-analytics/), [data collection docs](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection)). The app does not pass any of your entries to it.

If you run your own copy from this repository without Cloudflare, none of this applies: the app makes no requests beyond its own files.

## Your controls

- **Export:** Keeper's Room, "Export my data": a JSON file with commitments, completion history, reminders and settings. There is no import yet.
- **Delete:** Keeper's Room, "Delete all my data": removes the data, history, reminders, backups and prototype copies listed above for this browser. Your browser's own "clear site data" does the same.
- **Sound:** off by default; audio is only created after you interact and only when a sound toggle is on.

## Limits you should know about

- Anyone who can use this browser profile can read the data. It is not encrypted.
- Data is per browser and per device; it is not synced and not backed up unless you export it.
- Two open tabs can overwrite each other's changes (open review item M-6).
- The app does not connect to banks, move money or send reminders by email, push or text.

## If a server is added later

Accounts, per-user access checks, upload validation, private file storage and explicit consent before any external AI processing are required by `.kiro/steering/security.md` and must be built and reviewed before any such feature ships.
