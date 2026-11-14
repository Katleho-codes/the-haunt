import type { EffectEvent } from "@/lib/audio/events";

/**
 * Built-in synthesized sounds, one per event. Each is short (under one second), original (generated here, no samples)
 * and never louder than `peak`. They share a mood: wood, wax, paper, bells and low air, not beeps.
 */
export interface Voice {
  ctx: BaseAudioContext;
  /** Where the sound goes. The engine routes it to the output and the shared reverb. */
  out: AudioNode;
  /** Start time, in the context's clock. */
  t: number;
  /** Highest gain any part of the sound may reach. */
  peak: number;
}

/** Returns the sound's length in seconds. */
export type Recipe = (voice: Voice) => number;

const SILENT = 0.0001;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x2f6b; // fixed seed: the same texture every time
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

function envelope(param: AudioParam, t: number, attack: number, release: number, level: number): void {
  param.setValueAtTime(SILENT, t);
  param.exponentialRampToValueAtTime(Math.max(SILENT, level), t + attack);
  param.exponentialRampToValueAtTime(SILENT, t + attack + release);
}

interface ToneOptions {
  type: OscillatorType;
  freq: number;
  to?: number;
  start?: number;
  attack: number;
  release: number;
  level: number;
}

function tone(v: Voice, o: ToneOptions): number {
  const t = v.t + (o.start ?? 0);
  const osc = v.ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.attack + o.release);
  const gain = v.ctx.createGain();
  envelope(gain.gain, t, o.attack, o.release, v.peak * Math.min(1, o.level));
  osc.connect(gain).connect(v.out);
  osc.start(t);
  osc.stop(t + o.attack + o.release + 0.02);
  return (o.start ?? 0) + o.attack + o.release + 0.02;
}

interface NoiseOptions {
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  start?: number;
  attack: number;
  release: number;
  level: number;
}

function noise(v: Voice, o: NoiseOptions): number {
  const t = v.t + (o.start ?? 0);
  const length = o.attack + o.release + 0.02;
  const source = v.ctx.createBufferSource();
  source.buffer = noiseBuffer(v.ctx);
  const filter = v.ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.frequency.setValueAtTime(o.freq, t);
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t + length);
  filter.Q.value = o.q ?? 1;
  const gain = v.ctx.createGain();
  envelope(gain.gain, t, o.attack, o.release, v.peak * Math.min(1, o.level));
  source.connect(filter).connect(gain).connect(v.out);
  source.start(t, Math.random() * 0.5); // different slice of the same noise each time
  source.stop(t + length);
  return (o.start ?? 0) + length;
}

/** A soft bell: a fundamental plus two quieter, slightly inharmonic partials. */
function bell(v: Voice, freq: number, start: number, release: number, level: number): number {
  return Math.max(
    tone(v, { type: "sine", freq, start, attack: 0.004, release, level }),
    tone(v, { type: "sine", freq: freq * 2.76, start, attack: 0.002, release: release * 0.45, level: level * 0.28 }),
    tone(v, { type: "sine", freq: freq * 5.4, start, attack: 0.001, release: release * 0.2, level: level * 0.12 }),
  );
}

export const RECIPES: Record<EffectEvent, Recipe> = {
  // Interface: small and dry so they never get tiring.
  "ui.click": (v) => Math.max(
    noise(v, { filter: "bandpass", freq: 2200, q: 4, attack: 0.002, release: 0.025, level: 0.7 }),
    tone(v, { type: "sine", freq: 820, to: 520, attack: 0.002, release: 0.045, level: 0.45 }),
  ),
  "ui.navigate": (v) => Math.max(
    noise(v, { filter: "lowpass", freq: 600, to: 2200, q: 0.8, attack: 0.09, release: 0.22, level: 0.55 }),
    tone(v, { type: "sine", freq: 196, start: 0.05, attack: 0.03, release: 0.25, level: 0.25 }),
  ),
  "ui.open": (v) => Math.max(
    tone(v, { type: "triangle", freq: 233, to: 349, attack: 0.03, release: 0.22, level: 0.5 }),
    noise(v, { filter: "highpass", freq: 3000, attack: 0.04, release: 0.12, level: 0.18 }),
  ),
  "ui.close": (v) => Math.max(
    tone(v, { type: "triangle", freq: 330, to: 196, attack: 0.02, release: 0.2, level: 0.45 }),
    noise(v, { filter: "lowpass", freq: 900, attack: 0.01, release: 0.08, level: 0.25 }),
  ),
  // A candle catching: a soft hiss, then a warm blip.
  "ui.toggle": (v) => Math.max(
    noise(v, { filter: "highpass", freq: 2500, to: 1200, attack: 0.01, release: 0.12, level: 0.4 }),
    tone(v, { type: "sine", freq: 440, to: 660, start: 0.03, attack: 0.01, release: 0.12, level: 0.35 }),
  ),

  // Commitments: heavier, with a bell where something is settled.
  // A wax seal pressed onto paper: a low thump, a paper crinkle, then a small bell.
  "commitment.save": (v) => Math.max(
    tone(v, { type: "sine", freq: 110, to: 52, attack: 0.004, release: 0.22, level: 0.9 }),
    noise(v, { filter: "lowpass", freq: 1400, attack: 0.002, release: 0.07, level: 0.5 }),
    bell(v, 659.25, 0.09, 0.62, 0.45),
  ),
  // A soft three-note bell chord, rising.
  "commitment.complete": (v) => Math.max(
    bell(v, 523.25, 0, 0.6, 0.55),
    bell(v, 659.25, 0.08, 0.6, 0.45),
    bell(v, 783.99, 0.16, 0.66, 0.4),
  ),
  // Something returning: a swell up into a gentle bell.
  "commitment.restore": (v) => Math.max(
    tone(v, { type: "sine", freq: 294, to: 392, attack: 0.18, release: 0.22, level: 0.4 }),
    bell(v, 587.33, 0.16, 0.5, 0.35),
  ),
  // A ledger shut and slid into a drawer.
  "commitment.archive": (v) => Math.max(
    noise(v, { filter: "bandpass", freq: 900, q: 1.5, attack: 0.01, release: 0.12, level: 0.55 }),
    noise(v, { filter: "bandpass", freq: 500, q: 1.2, start: 0.12, attack: 0.05, release: 0.2, level: 0.4 }),
    tone(v, { type: "sine", freq: 130, to: 90, start: 0.12, attack: 0.005, release: 0.15, level: 0.5 }),
  ),
  // A dull, falling thud with dust: final but not harsh.
  "commitment.delete": (v) => Math.max(
    tone(v, { type: "sine", freq: 150, to: 55, attack: 0.004, release: 0.38, level: 0.85 }),
    noise(v, { filter: "lowpass", freq: 700, to: 200, attack: 0.005, release: 0.3, level: 0.45 }),
  ),

  // Capture: a quill scratching three quick strokes.
  "capture.interpret": (v) => Math.max(
    noise(v, { filter: "bandpass", freq: 3800, q: 3, attack: 0.02, release: 0.07, level: 0.5 }),
    noise(v, { filter: "bandpass", freq: 3300, q: 3, start: 0.12, attack: 0.02, release: 0.08, level: 0.45 }),
    noise(v, { filter: "bandpass", freq: 4200, q: 3, start: 0.25, attack: 0.02, release: 0.1, level: 0.4 }),
    tone(v, { type: "sine", freq: 392, start: 0.36, attack: 0.02, release: 0.25, level: 0.25 }),
  ),

  // Reminders: a distant bell, struck twice.
  "reminder.arrive": (v) => Math.max(bell(v, 880, 0, 0.5, 0.45), bell(v, 659.25, 0.32, 0.6, 0.4)),
  "reminder.snooze": (v) => tone(v, { type: "sine", freq: 330, to: 247, attack: 0.03, release: 0.3, level: 0.4 }),
  "reminder.dismiss": (v) => Math.max(
    noise(v, { filter: "bandpass", freq: 1500, q: 3, attack: 0.002, release: 0.03, level: 0.5 }),
    tone(v, { type: "sine", freq: 520, to: 400, attack: 0.002, release: 0.06, level: 0.3 }),
  ),

  // Warnings: low and slow; they ask for attention without startling.
  "system.warning": (v) => Math.max(
    tone(v, { type: "sine", freq: 110, attack: 0.08, release: 0.5, level: 0.6 }),
    tone(v, { type: "sine", freq: 103.83, attack: 0.08, release: 0.5, level: 0.5 }),
  ),
  "system.error": (v) => Math.max(
    tone(v, { type: "triangle", freq: 165, attack: 0.01, release: 0.12, level: 0.5 }),
    tone(v, { type: "triangle", freq: 147, start: 0.18, attack: 0.01, release: 0.16, level: 0.5 }),
  ),
};
