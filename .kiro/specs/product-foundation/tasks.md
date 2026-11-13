# Product foundation: tasks

- [ ] 1.1 Initialise git, confirm `.kiro/` is tracked, and add the owner-approved LICENSE. Needs owner decision on licence.
- [ ] 1.2 Pin dependency versions and re-run install, typecheck, build.
- [ ] 1.3 Add Vitest and fast-check; migrate `scripts/capture.test.cjs` to `tests/capture.test.ts`; make `npm test` run Vitest.
- [ ] 1.4 Fix the 9 lint errors (escape apostrophes, hydration pattern, test-file config) without disabling rules; confirm `npm run lint` exits 0.
- [ ] 1.5 Replace the `<img>` warning with `next/image` or document why not.
- [ ] 1.6 Extract `use-settings` and `use-commitments` hooks from `haunt-app.tsx` with no behaviour change.
- [ ] 1.7 Split `haunt-app.tsx` into the components listed in design.md, one view per task.
- [ ] 1.8 Add plain-language labels or tooltips to the five navigation items.
- [ ] 1.9 Verify no horizontal scroll at 390px on all five views using browser automation. Record the result.
- [ ] 1.10 Update README and `docs/PRODUCT-STATUS.md` to match verified reality.
