# Sounds in THE HAUNT

## Change a sound in one step

Edit **`lib/audio/sound-map.ts`**. Each line is one sound:

```ts
"commitment.save": { file: "/audio/seal.mp3", gain: 0.9 },
```

- Put the file in `public/audio/` (here `public/audio/seal.mp3`). The path in the map starts at `public/`, so it begins with `/audio/`.
- `file: null` means the built-in synthesized sound.
- `gain` (0 to 2) balances this sound against the others. The app's volume slider and an overall ceiling still apply, so a loud file cannot blast.
- If the file is missing, too large or cannot be decoded, the built-in sound plays instead. The Keeper's Room > Sound test shows which sounds use your file and why any did not load.

Then check it:

```bash
npm run check:audio   # paths, file existence and size limits (also runs before every build)
npm test              # includes the same check
```

## Formats and limits

| | Limit |
|---|---|
| Formats | `.mp3`, `.ogg`, `.wav`, `.m4a` |
| Each effect | 150 KB |
| `ambience.bed` | 2 MB |
| All audio files together | 4 MB |

Effects should be short: under about 2 seconds, trimmed, with no long silence at the start (a late start makes clicks feel slow). MP3 at 96 to 128 kbps keeps a 1-second effect around 15 KB.

A **one-minute loop** at 128 kbps is about 1 MB. That fits `ambience.bed`, but it is far too big for an effect. For a seamless loop, make the end match the start; the loop restarts without a gap.

## What the app does to your files automatically

You do not need to edit files for these:

- **Loudness:** each file is scaled so its loudest moment matches the others (very quiet files are raised by at most 8 times). `gain` is then only for taste.
- **Leading silence:** effects start at their first audible sound (up to 1 second is skipped), so a press feels instant. The ambient loop is not trimmed.
- **Length:** an effect plays for at most 4 seconds. A longer file fades out over the last 0.3 seconds instead of stopping dead. Every effect gets a tiny fade at its end so it cannot click.
- **Repeats and overlap:** pressing the same thing again restarts its sound rather than stacking a second copy. At most 8 sounds ring at once; when a 9th starts, the oldest fades out.
- **First press:** if a sound's file is still loading when it is needed (normally only the very first press after turning sound on), the app waits up to 0.35 seconds for it before using the built-in sound.
- **Ambient file:** while your ambient file loads, nothing plays. The built-in wind and room tone only plays if your file fails.

Long, loud effects on frequent actions (every click, every room change) wear quickly. Short, quiet sounds work best for `ui.*`; keep the big ones for rarer moments such as delete or a reminder.

## The events

| Group | Event | When it plays |
|---|---|---|
| Interface | `ui.click` | Any button, menu item or link that has no more specific sound |
| | `ui.navigate` | Moving between The Hall, Archive, Clocktower, Crypt and Keeper's Room |
| | `ui.open` | Opening a dialog, the reminders panel, search, a row menu or the mobile menu |
| | `ui.close` | Closing any of those (including with Escape) |
| | `ui.toggle` | A switch in The Keeper's Room, the sound button in the top bar |
| Commitments | `commitment.save` | Adding, editing or confirming a captured commitment, loading demo data |
| | `commitment.complete` | Completing a commitment |
| | `commitment.restore` | Restore, Undo, or restoring from the archive |
| | `commitment.archive` | Archiving |
| | `commitment.delete` | After a delete is confirmed |
| Capture | `capture.interpret` | Reading a pasted note into a proposal |
| Reminders | `reminder.arrive` | A reminder becomes due while the app is open; the test reminder |
| | `reminder.snooze` | Snoozing |
| | `reminder.dismiss` | Dismissing |
| Warnings | `system.warning` | Just before a delete confirmation appears |
| | `system.error` | An action could not be done (a commitment could not be saved, or was already completed or restored) |
| Ambience | `ambience.bed` | Loops while "Ambient atmosphere" is on |

Only one sound plays per press: a specific sound (save, delete, ...) replaces the generic click. To give one element its own sound, add `data-sound="ui.open"` (any event name) in the component; `data-sound="none"` silences it.

## Rules that always apply

- Nothing is created or played until the person presses something, and only when a sound toggle is on. The Sound test panel is the exception: pressing Play there plays the sound even when interaction sounds are off, and the panel says so.
- Ambience and interaction sounds have separate switches.
- Sound stops when the tab is hidden and fades back in when it returns.
- Sound is never the only signal: every action also shows text.

## Licences

Record every file you add in `docs/ASSET-REGISTER.md`: what it is, where it came from, its licence and any required attribution. Do not use sounds you are not allowed to redistribute: the repository and the deployed app are public.
