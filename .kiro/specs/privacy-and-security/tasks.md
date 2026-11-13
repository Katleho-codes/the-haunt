# Privacy and security: tasks

- [x] 8.1 Storage-location copy is in The Keeper's Room ("stores commitments in this browser only", plus a data note describing export and delete).
- [ ] 8.2 `buildExportBundle` (with a schema a future import can reuse) and `deleteAll` (data, history, reminders, corrupt-data backups, prototype copies) are done with unit tests and browser checks. `importAll` is NOT built, so this task stays open.
- [ ] 8.3 Add the secrets/unsafe-HTML check script and run it.
- [x] 8.4 `.env.example` now uses `USER:PASSWORD` placeholders.
- [ ] 8.5 Add security headers in `next.config.ts`; verify on a production build.
- [ ] 8.6 Write the privacy notice page: what is stored, where, what is never sent.
- [ ] 8.7 Review the whole app for logged user content and for claims that exceed implementation.
- [ ] 8.8 Run the quality-guardian agent for an independent privacy review; record findings.
