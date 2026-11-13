# Product foundation: requirements

Supersedes the shell and housekeeping parts of `core-experience`.

## Assumption awaiting owner approval
The MVP is local-first (browser storage behind a repository interface) with honest in-app reminders. A server-backed MVP is a separate, later decision. See `docs/IMPLEMENTATION-AUDIT.md` section 10.

## Goal
Make the repository trustworthy and releasable: tracked in git, licensed, passing its own checks, with a navigable app shell.

### Requirement 1: Repository integrity
- WHEN the repository is inspected THEN it SHALL be a git repository with `.kiro/` tracked and not ignored.
- WHEN the repository is inspected THEN a visible open-source LICENSE file SHALL exist.
- WHEN dependencies are listed THEN versions SHALL be pinned exactly.

### Requirement 2: Quality gates
- WHEN `npm run lint` runs THEN it SHALL exit 0 with no errors.
- WHEN `npm run typecheck`, `npm test` and `npm run build` run THEN each SHALL exit 0.
- WHEN a check cannot run THEN the status docs SHALL say so and SHALL NOT report it as passed.

### Requirement 3: Application shell
- WHEN a user opens any of The Hall, The Archive, The Clocktower, The Crypt or The Keeper's Room THEN a plain-language label SHALL be visible or available as an accessible name.
- WHEN the user is on any main destination THEN a Capture a Whisper action SHALL be reachable.
- WHEN the viewport is 390px wide THEN no horizontal scrolling SHALL occur on the five main destinations.

### Requirement 4: Maintainable structure
- WHEN domain logic is needed THEN it SHALL live in `lib/` and not in components.
- WHEN a component file exceeds about 300 lines THEN it SHALL be split into focused components.

### Requirement 5: Honest status
- WHEN a feature is described in README, UI or docs THEN the description SHALL match what is implemented and verified.
