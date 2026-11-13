---
inclusion: fileMatch
fileMatchPattern: ["**/*.test.*", "**/*.spec.*", "**/tests/**/*", "**/test/**/*"]
---
# Testing steering

- Test user-visible behaviour and domain invariants, not implementation details alone.
- Prioritise recurrence, date-only values, timezone/DST boundaries, amount conversion, reminder idempotency, AI proposal validation and per-user ownership.
- Use example-based tests plus property-based tests for high-value invariants.
- Every defect fix must add a regression test where practical.
- Never weaken TypeScript or disable a test solely to make a check pass.
- Distinguish tests that ran and passed from tests that could not run because dependencies/services were unavailable.
- Before release, run lint, typecheck, all tests and a production build, then verify the deployed application with browser automation.
