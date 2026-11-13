# Release and demo: design

- Hosting: owner chooses a free static/Next host (Vercel proposed). A local-first build needs no database, which keeps the demo free and stable.
- Demo data: an explicit "Load demo data" action seeds the fictional table in brief section 14. A "Reset demo" action restores it.
- E2E: Playwright against `next start`, running the signature journey and checking console errors. If Playwright cannot run in the environment, say so; do not substitute claims.
- Evidence: screenshots and test output stored under `docs/evidence/` with dates.
- Video script follows the 10-step sequence in brief section 14; no login or settings tour.
- Checklist and usage log are living docs, updated as tasks complete.
