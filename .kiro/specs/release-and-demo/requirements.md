# Release and demo: requirements

Follows brief sections 14 and 15. Recheck https://kiroween.devpost.com/rules immediately before submission.

### Requirement 1: Repository
- The public GitHub repository SHALL contain source, assets, setup instructions, a visible open-source licence, and `.kiro/` at the root, tracked and not ignored.
- Third-party assets and fonts SHALL be listed with licences in `docs/ASSET-REGISTER.md`.

### Requirement 2: Deployed demo
- The demo SHALL be publicly reachable, free to judges, and available through the judging period (ends 29 January 2027).
- IF login is required THEN judge credentials and reset instructions SHALL be provided; otherwise the demo SHALL need no login.
- The demo SHALL use fictional data only.

### Requirement 3: Signature journey
- WHEN a judge follows the demo script THEN they SHALL be able to capture a whisper, review it, confirm it, see it in The Hall and The Clocktower, see a test/in-app reminder, complete it and see it in The Crypt.
- An automated browser test SHALL cover this journey on the production build and its real result SHALL be recorded.

### Requirement 4: Video
- The YouTube video SHALL be public, under three minutes, show the real app, and use only original or licensed audio and no third-party marks.

### Requirement 5: Kiro usage
- `docs/KIRO-USAGE-LOG.md` SHALL list only Kiro work that happened, with dates and evidence.
- The submission write-up SHALL be drawn only from that log.

### Requirement 6: Honest checklist
- `docs/RELEASE-CHECKLIST.md` SHALL list every incomplete item. No item SHALL be ticked without evidence.

### Requirement 7: Freeze
- An internal freeze SHALL be set before the official deadline (4 December 2026, 14:00 Pacific; 5 December 00:00 SAST) with a margin of at least 24 hours.
