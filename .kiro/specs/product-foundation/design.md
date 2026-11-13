# Product foundation: design

## Repository
- `git init`, first commit contains source, `.kiro/`, docs and assets. Commits are made by the owner or on explicit request.
- Licence: owner decision (MIT proposed). Third-party assets must be listed in `docs/ASSET-REGISTER.md`.
- Pin dependencies in `package.json` (remove `^`). Keep `package-lock.json` committed.

## Test tooling
- Vitest for unit tests, fast-check for property tests. Tests live in `tests/` and import from `@/lib/*` directly. The existing `scripts/capture.test.cjs` is migrated and removed.
- ESLint config adjusted only to lint real source; no rule is disabled to hide a defect.

## Component structure
Split `components/haunt-app.tsx` into: `app-shell`, `sidebar-nav`, `hall-view`, `commitment-list-view`, `commitment-row`, `commitment-modal`, `capture-panel`, `settings-view`, and hooks `use-commitments`, `use-settings`, `use-haunt-sound`. State and persistence move into hooks that call `lib/` repositories.

## Hydration
Load persisted state with `useSyncExternalStore` or a lazy initialiser guarded for SSR, to remove the set-state-in-effect lint error.
