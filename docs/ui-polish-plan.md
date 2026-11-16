# UI polish plan

Agreed with the owner on 14 November 2026. Done in this order. A box is ticked only after its check passes.

- [x] **1. Yearly dates in The Clocktower.** "Next: 18 Mar · 18 Mar · 18 Mar" hides that the dates are three different years. Each date shows its year when it is not in the current year (so a monthly item reads "25 Nov · 25 Dec · 25 Jan 2027" and a yearly one "18 Mar 2027 · 18 Mar 2028 · 18 Mar 2029"). Logic in `lib/`, not in the component.
  Check: unit tests (all this year, crossing into next year, all in later years); browser shows the yearly item with three different years.
- [x] **2. Remove the dead filter icon** from the list search box.
  Check: no filter icon is rendered; the accessible-name sweep still passes.
- [x] **4. Readable text sizes.** Floor of 11px for monospace text (dates, labels, metadata) and 12px for body text, on every view, dialog and panel, at every width. Decorative, hidden text is exempt.
  Check: a new browser audit measures every visible text element and fails below the floor; screenshots at 390, 768 and 1280 px show no overflow, clipping or overlap.
- [x] **5. Hide "No additional details".** Show the details line only when a commitment has details.
  Check: browser test: a commitment without details shows no placeholder; one with details shows them.
- [x] **6. Shorter Hall hero on phones.** The first item of "Needs your attention" must be visible without scrolling on a phone.
  Check: browser test at 375 x 667 and 390 x 844: the first list item (or the empty state) is fully inside the first screen.
- [x] **3. Room motifs.** One decorative SVG layer behind each room heading: a clock face with a slowly swinging pendulum (The Clocktower), rising spirit wisps over a stone tablet (The Crypt), and shelved ledgers with a candle (The Archive). Hidden from screen readers, ignore clicks, slow motion only, still when motion is reduced, and never under the heading text or the button.
  Check: browser test: each motif is present in its room only, `aria-hidden`, not overlapping the heading text or the button at 390/768/1280 px, animated normally and still under reduced motion; screenshots reviewed.

After all six: typecheck, lint, unit tests, build, `npm run e2e`, `npm run e2e:sound`, contrast audit, screenshots.

## Results (item 3 and final pass)

- Two new browser steps in `e2e/smoke.mjs`. The overlap check measures heading text by its rendered lines and buttons by their box. When the motif was forced over the heading in a one-off test, it reported the eyebrow, h1 and p, so the check can fail.
- The candle glow kept moving under the device reduced-motion setting (only the in-app setting stopped it). Fixed in `globals.css`.
- The screenshot review found a bug that came before this plan. On phones and tablets, list rows ran past the edge of their list and the row menu (...) was cut off. The cause was a grid column that would not shrink below its content (`.commitment-list` now uses `minmax(0, 1fr)`). Long titles on touch screens were also cut mid-letter with no ellipsis, because the title was a flex box. The 390px overflow step now also runs at 768px. It checks that no row runs past its list and that every cut-off title ends in an ellipsis. Before the fixes it failed, and it passes after them.
- Final pass on 14 Nov 2026: typecheck, lint (0 errors, the 1 known `<img>` warning), 258 unit tests, build, `npm run e2e` (34 steps), `npm run e2e:sound` (13 steps), contrast (716 elements), text sizes (2776 elements), screenshots. All pass.
