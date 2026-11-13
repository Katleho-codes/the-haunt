# Privacy notes

Written 13 November 2026 for the local-first build. It describes what the code does today, not a legal policy. Have it reviewed before any real-user launch.

## What is stored, and where

Everything is stored in the browser's `localStorage` on the device you use. There is no account, no server, no database and no analytics.

| Data | Key prefix | Notes |
|---|---|---|
| Commitments, completion history, reminder records, settings | `the-haunt.store.v1.<user>` | Titles, notes, amounts, dates. Reminder records hold ids, dates and states only, not titles or amounts. |
| Backup of unreadable data | `the-haunt.corrupt.<user>.<time>` | A raw copy kept if stored data could not be read, so nothing is silently lost. Removed by Delete all. |
| Copy from the earlier prototype | `the-haunt.commitments.v1`, `the-haunt.settings.v1` | Kept after migration as a backup. Removed by Delete all. |

## What leaves the device

Nothing. The app makes no network requests while running (checked in the browser test, which fails if any request leaves the site). Fonts are bundled at build time. Text you type into capture is read by code on your device. It is **not** sent to an AI service, and the review step says so.

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
