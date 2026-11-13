# Product status

## Implemented in the local prototype

- [x] Responsive cinematic application shell
- [x] Dashboard with active, overdue, due-today and upcoming groupings
- [x] Manual create / edit / delete / complete / restore flows
- [x] Recurrence metadata and recurring view
- [x] Amount and multi-currency display
- [x] Local storage persistence
- [x] Quick text capture with deterministic parsing and editable review
- [x] Ambient / interaction sound preferences
- [x] Reduced-motion preference
- [x] JSON data export
- [x] Kiro steering and feature spec scaffolding

## Not implemented yet

- [ ] Backend API and authentication
- [ ] PostgreSQL persistence and migrations
- [ ] Recurrence occurrence materialisation and timezone-safe scheduling
- [ ] Reminder worker / email / web push delivery
- [ ] LLM-based extraction with schema validation
- [ ] PDF/image OCR and file scanning
- [ ] Voice transcription
- [ ] PWA service worker / offline sync conflict handling
- [ ] Automated tests and CI
- [ ] Privacy policy, data deletion workflow and production hardening

## Known design constraints

- Do not make a reminder appear delivered unless a delivery provider confirms it.
- Do not silently trust extracted date/amount/recurrence data; require review and confirmation.
- Do not imply bank connectivity or payment processing.
- Do not send personal documents to an external model without disclosure and consent.
