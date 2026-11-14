# Sound system plan

Agreed with the owner on 13 November 2026. Boxes are ticked only after the work is done **and** checked; the check is named under each task.

## Decisions

| Question | Answer |
|---|---|
| How are custom sounds supplied? | Audio files in `public/audio/`, mapped in one file, `lib/audio/sound-map.ts`. A built-in synthesized sound plays whenever a file is not set, missing, too large or cannot be decoded. |
| How granular? | One sound per **event**, organised in **groups** (interface, commitment, capture, reminder, system, ambience). Every interaction of a type uses its group's event. |
| Ambient sound | Procedural bed of **wind and room tone only** (no creaks, thunder or whispers). It follows the house mood (calm, watchful, restless). A file set for `ambience.bed` replaces it. |
| Owner's files | The owner has `.mp3` files of roughly one minute. A one-minute MP3 at 128 kbps is about 1 MB: it fits the **ambient** cap, but is far over the **effect** cap. Effects should be short clips (under about 2 seconds). |
| Size caps | 150 KB per effect file, 2 MB for the ambient file, 4 MB for all audio together. |
| Preview | The Keeper's Room test panel plays a sound even when interaction sounds are off, and says so. |

## Rules that do not change

- No audio is created until the person presses something, and only when a sound toggle is on (or they press a preview button).
- Ambience and interaction sounds keep separate toggles; one volume slider.
- Every source is capped (`GAIN_CEILING`), and a limiter sits on the output.
- Sound is never the only signal for anything; every action still shows text.
- Exactly one `AudioContext`.

## Events

| Group | Events |
|---|---|
| Interface | `ui.click`, `ui.navigate`, `ui.open`, `ui.close`, `ui.toggle` |
| Commitment | `commitment.save`, `commitment.complete`, `commitment.restore`, `commitment.archive`, `commitment.delete` |
| Capture | `capture.interpret` |
| Reminder | `reminder.arrive`, `reminder.snooze`, `reminder.dismiss` |
| System | `system.warning`, `system.error` |
| Ambience | `ambience.bed` |

## Tasks

- [x] **1. Sound map and validation.** Typed event list, `lib/audio/sound-map.ts`, path and gain rules, size rules, `docs/AUDIO.md`.
  Check: unit tests for the rules; a bad path or a missing event fails the typecheck or the tests.
- [x] **2. Audio engine.** One engine owning the `AudioContext`, master gain, limiter and a shared synthesized reverb. Loads and caches files, falls back to the built-in sound, limits overlapping voices, short cooldown per event, gated on a user gesture.
  Check: unit tests against a fake audio context (gate, one context, fallback, too-large file, cooldown, voice limit).
- [x] **3. Built-in sounds for every event.** A short, distinct recipe per event (for example a wooden tick for click, a wax-seal thump with a bell for save, a quill scratch for capture, a distant two-stroke bell for a reminder).
  Check: recording fake context: every recipe ends within 1 second and never exceeds its peak level.
- [x] **4. Ambient bed and mood.** Gusting filtered wind and a soft room tone with slow beating; mood changes crossfade over about 4 seconds; restless adds a faint pulse. A file for `ambience.bed` replaces it.
  Check: unit tests for the mood parameters and file replacement (done).
  - [x] The owner listened and approved the sounds on 14 November 2026 ("sounds incredible"). The agent cannot hear them.
- [x] **5. Wire every interaction.** Generic click sound for any button, menu item or switch; specific sounds for meaningful actions, which suppress the generic click so nothing plays twice. `data-sound` overrides, `data-sound="none"` silences.
  Check: unit test of the click resolver; browser test of each group.
- [x] **6. Sound test panel.** In The Keeper's Room: a Play button per event, grouped, showing "your file" or "built-in" and any load error; a timed ambient preview.
  Check: browser test presses every Play button and reads the engine's event log.
- [x] **7. Pause when the tab is hidden.** Fade out and suspend when hidden; resume with a fade when visible; no effects while hidden.
  Check: unit test with fake timers; browser test fires visibility changes.
- [x] **8. Size check command.** `npm run check:audio`, also run before every `npm run build` (so the Docker build) and by `npm test`.
  Check: run it; an oversized or missing file makes it fail.
- [x] **9. Browser tests.** `e2e/sound.mjs`: right event per action, nothing while muted, exactly one `AudioContext`, hidden-tab behaviour, preview panel.
  Check: the script passes against a production build; the existing 30-step smoke test still passes.
- [x] **10. Docs and records.** `docs/AUDIO.md`, asset register row for owner audio, README, cinematic-experience spec, usage log.
  Check: the docs match the code.

## Not done by the agent

- Choosing or recording the owner's sounds, and judging how they sound.
- Recording the source and licence of each owner file (a row is ready in `docs/ASSET-REGISTER.md`).

## Verification record (14 November 2026)

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass: 0 errors, 1 existing `<img>` warning |
| `npm test` | Pass: 17 files, 244 tests (63 of them audio) |
| `npm run check:audio` | Pass. Also proved to fail for an oversized file, a missing file, a path outside `/audio/` and a gain of 3, and to stop `npm run build` before Next starts |
| `npm run build` | Pass (runs the audio check first) |
| `npm run e2e:sound` (Edge, production build) | Pass: 13 steps |
| `npm run e2e` (existing smoke test) | Pass: 30 steps |
| `node e2e/contrast.mjs` | Pass: 725 text elements (the panel adds text) |
| `docker build` | Pass; the audio check runs inside the image build |
| Removing an event from the map | Typecheck fails, as intended |

Bugs found by the checks and fixed: the generic open/close sound read a menu's state after React had already changed it (opening a row menu played the close sound). A server started before a build finished served stale files; that was a test-run mistake, not an app bug.

Not verified: how any sound actually sounds (the owner listens), Chrome/Firefox/Safari, phones, and the owner's own files (none added yet).

## Follow-up after the owner added files (14 November 2026)

The owner mapped 13 events to 11 Pixabay MP3s. A check of those files found real problems, fixed as follows. Each box was ticked after its test passed.

- [x] **11. Fade long effects.** Effects over 4 s fade out over 0.3 s instead of stopping dead; every file effect ends with a tiny fade. Check: unit tests on the scheduled gain ramps.
- [x] **12. No built-in bed before the owner's ambient file.** While the file loads, nothing plays; the built-in bed plays only if the file fails; switching ambience off during loading stops it from starting. Check: unit tests; the browser test samples the state every 50 ms after switching on and fails if the built-in bed ever appears.
- [x] **13. Trim leading silence.** Effects start at their first audible sample (up to 1 s skipped; ambient loops are not trimmed). Check: unit tests (threshold, cross-channel, maximum, ambient untouched).
- [x] **14. Match loudness.** Every file is scaled to a common peak (at most 8x for quiet files). Your soft scream peaked at 0.10 against about 1.0 for the others. Check: unit tests.
- [x] **15. First press uses the file.** A press while its file loads waits up to 0.35 s for it instead of playing the built-in sound. Check: unit tests (file arrives in time; file too slow falls back once, no double sound); in the browser, the first press of the navbar sound icon on a fresh visit now plays the file.
- [x] **16. Sounds no longer stop after a few quick actions.** Found by the browser test: with several 4 s files ringing, the 8-voice cap refused new sounds, so actions went silent. Now the newest sound always plays, the oldest fades out, and the same sound pressed again restarts instead of stacking. Check: unit tests; the full browser sound test passes with the owner's files.
- [x] **17. Licences and credits.** Pixabay Content License recorded; credits table in `docs/ASSET-REGISTER.md`; `public/audio/LICENSE-AUDIO.md` states the files are not MIT; README licence section updated.
  - [ ] Owner: four files have no matching attribution (472369, 103708, 206591, 15981), and three supplied attributions match no file (142446, 39908, 393914). Confirm and correct.

Checks after the follow-up: typecheck, lint (0 errors), `npm test`, `npm run check:audio`, build, `npm run e2e:sound` (13 steps, now using the owner's files and checking each source against the map), `npm run e2e` (30 steps).
