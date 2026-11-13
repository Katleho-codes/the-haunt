/**
 * Loudness rules for the synthesized sound. Kept pure so the ceiling can be tested.
 * `volume` is the user's 0 to 1 setting; the Keeper's Room slider stops at 0.7.
 */
export const MAX_VOLUME = 0.7;
/** No single sound source may exceed this linear gain, whatever the setting or imported data says. */
export const GAIN_CEILING = 0.08;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const safeVolume = (volume: number) => (Number.isFinite(volume) ? clamp(volume, 0, MAX_VOLUME) : 0);

/** Low room tone. Very quiet by design. */
export function ambienceGain(volume: number): number {
  return Math.min(GAIN_CEILING, Math.max(0.001, safeVolume(volume) * 0.1));
}

/** Short interaction tones. A small floor keeps them audible at low settings. */
export function effectGain(volume: number): number {
  return Math.min(GAIN_CEILING, Math.max(0.015, safeVolume(volume) / 30));
}
