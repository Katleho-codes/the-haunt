> **Superseded** by `product-foundation` and `commitment-domain` on 2026-11-13. Kept for history. Do not execute tasks from this file.

# Core experience — requirements

## Goal
Provide a useful local-first commitments ledger inside the THE HAUNT cinematic experience.

## User stories and acceptance criteria

### Requirement 1 — Capture a commitment
As a user, I want to create a commitment with a title and due date so that I can remember it.

- WHEN a user submits a valid commitment THEN the system SHALL save it with a unique identifier and pending status.
- WHEN a required title or due date is missing THEN the system SHALL prevent saving and identify the missing field.
- WHEN a user creates a commitment THEN the system SHALL show the new record in the active ledger without a full page reload.

### Requirement 2 — Maintain a commitment
As a user, I want to edit or delete a commitment so that my ledger remains accurate.

- WHEN a user edits a commitment THEN the system SHALL preserve its identifier and creation timestamp.
- WHEN a user deletes a commitment THEN the system SHALL request confirmation before destructive deletion.

### Requirement 3 — Resolve a commitment
As a user, I want to mark a commitment complete and restore it if necessary.

- WHEN a pending commitment is completed THEN the system SHALL mark it completed and record the completion timestamp.
- WHEN a completed commitment is restored THEN the system SHALL return it to pending status and clear its completion timestamp.

### Requirement 4 — Organise commitments
As a user, I want to view commitments by status, due date and recurrence.

- WHEN a user opens The Hall THEN the system SHALL distinguish overdue, due-today and upcoming commitments.
- WHEN a user opens The Clocktower THEN the system SHALL show active commitments with a recurrence rule.
- WHEN a user opens The Crypt THEN the system SHALL show completed commitments.
- WHEN a user searches the ledger THEN the system SHALL filter by title, description and category.

### Requirement 5 — Respect user preferences
As a user, I want control over sound and motion so that the experience remains comfortable.

- WHEN a new user opens the application THEN audible playback SHALL remain disabled until explicitly enabled.
- WHEN reduced motion is enabled THEN atmospheric animations and transitions SHALL be minimised.
- WHEN the user changes a preference THEN the preference SHALL persist in the current browser.

### Requirement 6 — Preserve data locally in the prototype
As a user, I want my entries to persist and be exportable.

- WHEN a commitment changes THEN the application SHALL persist the latest ledger to browser storage.
- WHEN a user exports data THEN the application SHALL download a JSON representation of commitments and settings.

## Constraints
- Current prototype is browser-local and has no authenticated server.
- Reminder preferences are metadata only until a real scheduler/delivery service exists.
- Never represent a notification as delivered when no delivery service confirms it.
