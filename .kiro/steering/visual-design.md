---
inclusion: fileMatch
fileMatchPattern: ["**/*.css", "components/**/*.tsx", "app/**/*.tsx", "public/**/*.svg"]
---
# Visual design steering — THE HAUNT

## Art direction
Cinematic supernatural horror: an abandoned Victorian manor at night, fog, candlelit details, distant silhouettes, aged ledgers and subtle paranormal movement. The visual system must feel authored and coherent, not like a collection of Halloween stickers.

## Design tokens
- Void Black `#080B0B`
- Deep Shadow `#101615`
- Haunted Green `#19231F`
- Bone Ivory `#E9E1CF`
- Ash `#777B70`
- Spectral Green `#A9BD88`
- Candlelight `#D8AA66`
- Blood Rust `#9C4549` (reserve for actual warnings)

## Typography
- Display: Cormorant Garamond (fallback Georgia)
- UI: DM Sans (fallback Arial)
- Metadata: IBM Plex Mono (fallback Courier New)

## Interaction rules
- Keep text, controls and data on sufficiently flat surfaces.
- Horror effects must not obscure information, move controls unexpectedly or block task completion.
- Sound is opt-in and defaults off. Provide separate ambience and interaction toggles.
- Respect reduced-motion settings.
- Preserve visible focus states and keyboard usability.
- Use red for genuine warnings, not decoration.
- Prefer slow atmospheric motion over constant animation.
