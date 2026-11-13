---
inclusion: always
---
# Security and privacy steering

Commitments and attachments may expose personal, household and financial information.

- Enforce per-user access control before any backend record is returned or changed.
- Validate all request bodies and uploaded files at the server boundary.
- Never trust browser input or AI-extracted data.
- Do not expose attachments through public, guessable URLs.
- Do not log document text, payment details or sensitive notes.
- External AI processing requires clear disclosure and user consent.
- Keep secrets server-side.
- Provide data export and deletion paths before production launch.
- Never claim financial connectivity or payment execution unless explicitly implemented and verified.
