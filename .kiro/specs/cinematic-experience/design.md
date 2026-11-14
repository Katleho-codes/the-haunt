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

## Sound system (13 November 2026)

Replaces the single in-component sound hook. Plan and progress: `docs/sound-system-plan.md`; how to change sounds: `docs/AUDIO.md`.

- `lib/audio/events.ts`: 17 events in six groups. `lib/audio/sound-map.ts`: the one file the owner edits (file path or `null` and a gain per event).
- `lib/audio/engine.ts`: one AudioContext, master fade, limiter, shared synthesized reverb, file loading with built-in fallback, cooldown and voice cap, ambient bed, hidden-tab suspend, and a debug event log (event names only).
- `lib/audio/recipes.ts`: built-in sound per event. `lib/audio/ambient.ts`: wind and room tone (owner chose no creaks, thunder or whispers), mood glides over about 4 s.
- `lib/audio/click-sound.ts` and `components/use-haunt-sound.ts`: one generic click per press, decided at the start of the click; specific actions claim the press so nothing plays twice.
- `components/sound-test-panel.tsx`: Play per event in The Keeper's Room.
- `scripts/check-audio.mjs`: path, existence and size check (150 KB per effect, 2 MB ambient, 4 MB total), run by `prebuild`.
