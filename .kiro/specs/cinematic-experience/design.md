# Cinematic experience: design

## Keep
Existing tokens, `public/haunted-manor.svg`, CSS-first motion, Web Audio synthesis. No new animation dependency unless a specific interaction cannot be done in CSS.

## Domain hook
`lib/domain/house-state.ts`: `computeHouseState(commitments, today): "calm" | "watchful" | "restless"` pure and tested. Components only render the result.

## Settings
`Settings { ambience: boolean; effects: boolean; volume: number /*0-1*/; motion: "system" | "reduced" | "full"; intensity: "full" | "restrained" | "low" }`. `system` follows `prefers-reduced-motion` via CSS media query and the root `data-motion` attribute set before hydration to avoid a flash.

## CSS
- Add `@media (prefers-reduced-motion: reduce)` mirroring the existing `[data-reduce-motion="true"]` block.
- `data-intensity="low"` hides fog layers and the grain.

## Audio
`use-haunt-sound` creates the `AudioContext` only after a user gesture, routes everything through one master gain capped at a fixed maximum, and stops all nodes on disable.

## Completion animation
Row gets `data-leaving` for a short CSS transition, then is removed from the list; an `aria-live` toast announces the result with Undo. Reduced motion skips the transition.

## Verification
Browser-automation screenshots at 390, 768 and 1280 widths, an axe-style accessibility scan, and a manual keyboard pass. Results are recorded in `docs/PRODUCT-STATUS.md`, including anything not run.

## Implemented design (13 November 2026)
- `computeHouseState` lives in `lib/domain/house-state.ts`. Calm / Watchful (3+ active items due within 7 days, none overdue) / Restless (any overdue). The shell sets `data-house`, which restyles only background layers and the status card.
- Settings: `motion` (`system` | `reduced` | `full`) and `intensity` (`full` | `restrained` | `low`). Old `reduceMotion: true` is migrated to `motion: "reduced"`. CSS applies `prefers-reduced-motion` unless `data-motion="full"`.
- Sound: `lib/audio/levels.ts` caps every source (ceiling 0.08). The AudioContext is created only after the first pointer or key press and only when a sound toggle is on. One master gain node feeds the output.
- Completion: the data change is immediate; a cloned row is drawn over the list and fades out (skipped under reduced motion). A toast with Undo is announced via `role="status"`. Adding a commitment from a reviewed proposal shows a seal stamp plus the text "Sealed...".
- Dialog: Tab is trapped inside, Escape closes, focus returns to the opener.
- Fonts: loaded with `next/font/google` at build time (self-hosted).
- Touch: under 768px or on coarse pointers the controls grow to at least 24px with a 44px tap area for the complete button.