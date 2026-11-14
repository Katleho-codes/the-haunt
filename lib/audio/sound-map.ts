import type { SoundMap } from "./events";

/**
 * THE ONE FILE TO EDIT TO CHANGE A SOUND.
 *
 * 1. Put your audio file in `public/audio/` (for example `public/audio/seal.mp3`).
 * 2. Set `file` for the event to its path from `public/`: "/audio/seal.mp3".
 * 3. Adjust `gain` (0 to 2, default 1) if it is too loud or too quiet next to the others.
 * 4. Check it in The Keeper's Room > Sound test, then run `npm run check:audio`.
 *
 * `file: null` uses the built-in synthesized sound. If a file is missing, too large or cannot be decoded, the built-in
 * sound plays instead and the test panel shows why.
 *
 * Formats: .mp3, .ogg, .wav or .m4a. Limits: 150 KB per effect, 2 MB for "ambience.bed", 4 MB for all files together.
 * Effects should be short (under about 2 seconds). A one-minute loop belongs on "ambience.bed".
 * Record where every file came from, and its licence, in docs/ASSET-REGISTER.md.
 *
 * This file is also read by `scripts/check-audio.mjs` with Node's type stripping: keep it to plain data.
 */
export const SOUND_MAP: SoundMap = {
  // Interface
  "ui.click": { file: "/audio/freesound_community-monster-growl-6311.mp3", gain: 1 },
  "ui.navigate": { file: "/audio/wolfy_sanic-soft-scream-15981.mp3", gain: 1 },
  "ui.open": { file: "/audio/mrlockjaw-jumpscare-2-206591.mp3", gain: 1 },
  "ui.close": { file: "/audio/universfield-scary-swoosh-02-454676.mp3", gain: 1 },
  "ui.toggle": { file: "/audio/freesound_community-horror-sfx-3-103708.mp3", gain: 1 },

  // Commitments
  "commitment.save": { file: "/audio/dragon-studio-scary-sound-410559.mp3", gain: 1 },
  "commitment.complete": { file: "/audio/alex_jauk-ghostly-laughing-147610.mp3", gain: 1 },
  "commitment.restore": { file: "/audio/wolfy_sanic-soft-scream-15981.mp3", gain: 1 },
  "commitment.archive": { file: "/audio/dragon-studio-creepy-whisper-472369.mp3", gain: 1 },
  "commitment.delete": { file: "/audio/mrlockjaw-jumpscare-206590.mp3", gain: 1 },

  // Capture
  "capture.interpret": { file: null, gain: 1 },

  // Reminders
  "reminder.arrive": { file: "/audio/imagne_impossible-horror-scary-human-whisper-ghost-05-257014.mp3", gain: 1 },
  "reminder.snooze": { file: null, gain: 1 },
  "reminder.dismiss": { file: "/audio/universfield-scary-swoosh-02-454676.mp3", gain: 1 },

  // Warnings
  "system.warning": { file: null, gain: 1 },
  "system.error": { file: null, gain: 1 },

  // Ambience: a looping file replaces the built-in wind and room tone.
  "ambience.bed": { file: "/audio/samuelfjohanns-creepy-ambient-7539.mp3", gain: 1 },
};
