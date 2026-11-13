# Privacy and security: design

- Data controls live in `components/settings-view.tsx` and call `lib/storage` functions `exportAll`, `importAll`, `deleteAll`.
- Import goes through the same Zod schemas as storage loads; invalid files produce a readable error and change nothing.
- Headers set in `next.config.ts` via `headers()`. CSP starts strict (self only plus inline styles needed by Next) and is tightened after checking the production build for violations.
- A grep-based check script (`npm run check:secrets`) scans for key-like strings and `dangerouslySetInnerHTML`; it is a guard, not a substitute for review.
- Third-party consent state stored locally with timestamp and provider name; default none.
- Backend ownership design is deferred to a separate spec if the owner approves a server.
