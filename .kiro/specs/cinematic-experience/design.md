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
