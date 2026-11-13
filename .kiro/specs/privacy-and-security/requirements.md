# Privacy and security: requirements

Follows `.kiro/steering/security.md` and brief sections 5.6 and 8.

### Requirement 1: Local data
- WHEN data is stored in the browser THEN the Keeper's Room SHALL say it is stored on this device only.
- WHEN the user exports THEN the file SHALL contain only their data and a schema version.
- WHEN the user chooses delete-all THEN, after confirmation, all app data in browser storage SHALL be removed and the UI SHALL confirm in text.

### Requirement 2: No secrets in the client
- The repository SHALL contain no credentials, keys or real personal documents.
- `NEXT_PUBLIC_*` variables SHALL NOT hold secrets.
- `.env.example` SHALL contain placeholders only; passwords in example URLs SHALL be obviously fake.

### Requirement 3: Untrusted input
- WHEN data is imported, loaded from storage or returned by a parser or model THEN it SHALL be validated against a schema before use.
- WHEN user text is rendered THEN it SHALL be rendered as text and SHALL NOT use `dangerouslySetInnerHTML`.

### Requirement 4: Logging
- The app SHALL NOT log commitment titles, notes, amounts or document text.

### Requirement 5: External processing
- WHEN any feature would send user content to a third party THEN a disclosure and explicit consent SHALL come first, and the feature SHALL be off by default.

### Requirement 6: Ownership (server phase, gated)
- IF a backend is added THEN every read and write SHALL check the authenticated user's ownership, with tests proving another user's records are not returned.

### Requirement 7: Security headers
- The deployed app SHALL set a Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy` and frame restrictions, verified on the deployed URL.

### Requirement 8: Claims
- The app and docs SHALL NOT claim bank connectivity, payment execution or reminder delivery that does not exist.
