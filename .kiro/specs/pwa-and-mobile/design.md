# PWA and mobile: design

- Icons: generate PNG 192, 512 and maskable 512 from `public/haunt-icon.svg`; record provenance in `docs/ASSET-REGISTER.md`.
- Service worker: a small hand-written `public/sw.js` with versioned precache of static assets and a navigation fallback, registered from a client component only in production. Avoid adding a PWA library unless the hand-written worker proves fragile.
- Update flow: waiting worker triggers a toast with a Reload action.
- Share target: manifest `share_target` with GET to `/capture?text=...`; the page pre-fills the capture panel. Test on a real Android Chrome before documenting.
- Verification: Lighthouse installability audit and offline reload in a real browser; record results, including failures.
