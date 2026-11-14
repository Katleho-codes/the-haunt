/**
 * Prepares a decoded audio file before it is played. Pure functions on sample arrays, so they can be tested without
 * a browser.
 *
 * - Loudness: every file is scaled so its loudest sample reaches TARGET_PEAK. Files from different sources then sit at
 *   similar levels, and `gain` in the sound map is only for taste. Very quiet files are raised by at most MAX_BOOST, so
 *   near-silent noise is not blown up.
 * - Leading silence: effects start at their first audible sample (minus a short lead-in), so a press feels immediate.
 *   Ambient loops are not trimmed, because that would change the loop.
 */
export const TARGET_PEAK = 0.9;
export const MAX_BOOST = 8;
/** A sample counts as audible above this fraction of the file's own peak. */
export const ONSET_THRESHOLD = 0.03;
export const ONSET_LEAD_SECONDS = 0.005;
/** Never skip more than this, even if a file is silent for longer at the start. */
export const MAX_TRIM_SECONDS = 1;

export interface Prepared {
  /** Multiply every sample by this. */
  scale: number;
  /** Start playback this many seconds into the file. */
  offset: number;
  /** Peak before scaling, for reports. */
  peak: number;
}

export function peakOf(channels: readonly Float32Array[]): number {
  let peak = 0;
  for (const data of channels) {
    for (let i = 0; i < data.length; i++) {
      const value = Math.abs(data[i]);
      if (value > peak) peak = value;
    }
  }
  return peak;
}

export function onsetOf(channels: readonly Float32Array[], sampleRate: number, peak: number): number {
  if (peak <= 0) return 0;
  const threshold = peak * ONSET_THRESHOLD;
  const length = Math.max(0, ...channels.map((c) => c.length));
  const limit = Math.min(length, Math.floor(MAX_TRIM_SECONDS * sampleRate));
  for (let i = 0; i < limit; i++) {
    for (const data of channels) {
      if (Math.abs(data[i] ?? 0) > threshold) return Math.max(0, i / sampleRate - ONSET_LEAD_SECONDS);
    }
  }
  return limit / sampleRate;
}

export function prepareSamples(channels: readonly Float32Array[], sampleRate: number, options: { trim: boolean }): Prepared {
  const peak = peakOf(channels);
  const scale = peak > 0 ? Math.min(MAX_BOOST, TARGET_PEAK / peak) : 1;
  const offset = options.trim ? onsetOf(channels, sampleRate, peak) : 0;
  return { scale, offset, peak };
}

/** Scales the samples in place. */
export function applyScale(channels: readonly Float32Array[], scale: number): void {
  if (scale === 1) return;
  for (const data of channels) for (let i = 0; i < data.length; i++) data[i] *= scale;
}
