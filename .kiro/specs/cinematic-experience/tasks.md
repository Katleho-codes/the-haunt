# Cinematic experience: tasks

Depends on product-foundation 1.6.

- [x] Prototype tokens, manor SVG, fog and grain, synthesized tones, mobile drawer exist (see `visual-atmosphere`).
- [x] 6.1 Add `@media (prefers-reduced-motion: reduce)` and the `system | reduced | full` motion setting; set the attribute without a hydration flash.
- [x] 6.2 Add `computeHouseState` with tests for each state and the boundaries.
- [x] 6.3 Render the house state label and drive the environment from it.
- [x] 6.4 Split sound settings into ambience, interaction, volume in The Keeper's Room; cap master gain; confirm defaults are off on a clean profile.
- [x] 6.5 Add completion dissolve with Undo toast; verify Crypt entry and reduced-motion path.
- [x] 6.6 Add seal animation for add and save-proposal with text confirmation.
- [x] 6.7 Modal focus trap, Escape and focus return; test by keyboard.
- [ ] 6.8 Overdue rows already show the text "N days overdue" plus a red edge, and the restless meter/number use red. NOT reviewed line by line against the steering (red appears in several CSS rules). Left open.
- [x] 6.9 Contrast audit of muted text (`--ash`) on all surfaces; fix failures.
- [x] 6.10 Self-host fonts or use fallbacks per the asset register; confirm no render-blocking font load.
- [x] 6.11 Capture screenshots at 390, 768, 1280 widths; fix horizontal scroll or overlap found.
- [ ] 6.12 NOT BUILT. Optional: Clocktower pendulum motif and Crypt resolved-spirit motif.

Verification notes (13 November 2026): 6.2 by unit and property tests (`tests/experience.test.ts`). 6.1, 6.3 to 6.7, 6.10 by `npm run e2e` in Microsoft Edge. 6.9 by `node e2e/contrast.mjs`, which measured 677 text elements across all views and dialogs; it approximates gradient backgrounds by their average colour and skips disabled controls, so it is a strong check, not a full audit. 6.11 by `node e2e/screenshots.mjs` (screenshots in `docs/evidence/screenshots/`), which also found real problems: touch targets under 24px at 390 and 768 px wide, now fixed.

## Sound system (added 13 November 2026, owner request)

- [x] 6.13 Sound map, engine, built-in sounds for every interaction group, ambient wind and room tone following the house mood, Sound test panel, hidden-tab pause, size check, unit and browser tests. Details and checks: `docs/sound-system-plan.md`.
- [ ] 6.14 Owner listens to the built-in sounds and the ambient bed and approves or asks for changes; owner adds their own files with licences recorded.
