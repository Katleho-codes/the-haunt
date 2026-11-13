# Cinematic experience: requirements

Supersedes `visual-atmosphere`. Follows brief section 7 and `.kiro/steering/visual-design.md`.

### Requirement 1: Coherent environment
- The environment SHALL be layered (void, manor silhouette, fog, vignette, grain, light sources) and sit behind content.
- Text, forms and data SHALL sit on flat, sufficiently opaque surfaces.
- WHEN the first viewport loads on desktop THEN the hero SHALL NOT push the commitment list below the fold.

### Requirement 2: Workload state
- The environment state SHALL be computed deterministically: **Calm** when nothing is overdue and 0 to 2 items are due in 7 days; **Watchful** when 3 or more are due in 7 days and none overdue; **Restless** when one or more are overdue. (Thresholds are proposed and may change with owner approval.)
- WHEN the state changes THEN a text label of the state SHALL be visible.
- State wording SHALL be calm and non-shaming.

### Requirement 3: Feedback choreography
- WHEN a commitment is added or a proposal saved THEN a short seal/candle animation SHALL play AND a text confirmation SHALL appear.
- WHEN an item is completed THEN it SHALL dissolve and appear in The Crypt AND a text confirmation with an Undo SHALL appear.
- WHEN an item is overdue THEN it SHALL show the text "overdue" and a restrained red edge, not red alone.
- Animation SHALL NOT move controls.

### Requirement 4: Sound
- WHEN the app first loads THEN no audio SHALL play and the saved sound settings SHALL default to off.
- Ambience and interaction sounds SHALL have separate toggles in The Keeper's Room and a volume control; settings SHALL persist.
- Audio gain SHALL be capped to avoid spikes.
- The Easter egg SHALL only be possible when interaction sound is on.
- No state SHALL be conveyed by sound alone.

### Requirement 5: Motion and accessibility
- WHEN the OS requests reduced motion THEN ambient animation SHALL be minimised without the user changing an in-app setting.
- WHEN the in-app reduced-motion or visual-intensity setting changes THEN it SHALL apply immediately and persist.
- All controls SHALL have visible focus, keyboard operation and accessible names.
- Normal text SHALL have at least 4.5:1 contrast against its surface; large text 3:1.
- The modal SHALL trap focus, close on Escape and return focus to its trigger.

### Requirement 6: Responsiveness
- The layout SHALL work at 390, 768 and 1280 px widths with no horizontal scrolling and touch targets of at least 44px for primary actions.
