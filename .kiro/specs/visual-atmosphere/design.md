> **Superseded** by `cinematic-experience` on 2026-11-13. Kept for history. Do not execute tasks from this file.

# Visual atmosphere — design

## Art direction
Cinematic supernatural horror: abandoned Victorian manor, low fog, moonlight, candlelit details, dark ledgers, aged surfaces and subtle supernatural cues. Use restrained spectral green and candlelight accents against deep charcoal/green-black surfaces.

## Implementation layers
- Original SVG manor artwork in `public/haunted-manor.svg`.
- CSS fog, vignette, grain, moonlight, firefly and hover states.
- Web Audio API synthesis for original ambient and interaction tones.
- Motion should remain CSS-first until a complex state-driven animation clearly justifies Rive or another dependency.

## Accessibility
Provide explicit sound controls, default mute, reduced motion, clear focus indicators, semantic controls, and readable contrast. A muted/reduced-motion experience must retain all product capability.
