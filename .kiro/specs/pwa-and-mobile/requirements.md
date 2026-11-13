# PWA and mobile: requirements

Follows brief sections 3.2 and 4.2. Should Have, after the MVP core is stable.

### Requirement 1: Installability
- WHEN the app is audited for installability THEN the manifest SHALL include name, start URL, display mode, theme colour and PNG icons at 192 and 512 px (including a maskable icon).
- WHEN the browser supports install THEN the app SHALL be installable; the install prompt SHALL be user-initiated.

### Requirement 2: Offline shell
- WHEN the user is offline after a first visit THEN the app shell and locally stored commitments SHALL open.
- WHEN a new version is available THEN the user SHALL be told and SHALL choose when to reload.
- The service worker SHALL NOT cache anything outside the app's own static assets.

### Requirement 3: Honest offline and reminder behaviour
- WHEN offline THEN the UI SHALL not claim cloud sync or background reminders.

### Requirement 4: Mobile ergonomics
- Capture a Whisper SHALL be reachable with one tap from every main view on mobile.
- Primary controls SHALL be at least 44px.
- Safe-area insets SHALL be respected on notched devices.

### Requirement 5: Share target (optional, verified)
- WHEN a Web Share Target is added THEN it SHALL be documented only for browsers where it was tested, and shared text SHALL open the capture review step and SHALL NOT save automatically.
