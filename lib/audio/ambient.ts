/**
 * The ambient room. Built-in version: gusting filtered wind plus a soft room tone with slow beating. No creaks,
 * thunder or voices (owner decision, 13 November 2026). The house mood changes how it moves, never how loud it gets
 * beyond the overall level.
 */
export type Mood = "calm" | "watchful" | "restless";

export interface AmbientParams {
  /** Wind level, 0 to 1 of the bed. */
  wind: number;
  /** How far gusts swing the wind level, as a fraction of `wind`. */
  gustDepth: number;
  /** Gusts per second. */
  gustRate: number;
  /** Centre of the wind filter in Hz (brighter = more restless). */
  filter: number;
  /** Room tone level, 0 to 1 of the bed. */
  tone: number;
  /** A faint slow pulse in the room tone, as a fraction of `tone`. 0 = none. */
  pulseDepth: number;
}

const PARAMS: Record<Mood, AmbientParams> = {
  calm: { wind: 0.55, gustDepth: 0.35, gustRate: 0.05, filter: 380, tone: 0.5, pulseDepth: 0 },
  watchful: { wind: 0.7, gustDepth: 0.5, gustRate: 0.08, filter: 520, tone: 0.55, pulseDepth: 0 },
  restless: { wind: 0.8, gustDepth: 0.6, gustRate: 0.11, filter: 640, tone: 0.65, pulseDepth: 0.35 },
};

export function ambientParams(mood: Mood): AmbientParams {
  return PARAMS[mood];
}

/** Mood changes glide over about four seconds (three time constants). */
export const MOOD_GLIDE = 1.3;

export interface AmbientBed {
  readonly kind: "procedural" | "file";
  setMood(mood: Mood, at: number): void;
  setLevel(level: number, at: number): void;
  /** Fade out over `fade` seconds and release every node. */
  stop(at: number, fade: number): void;
}

function warmNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x51ed;
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const white = (seed / 0x7fffffff) * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // brownian: deep and soft, like wind through a house
    data[i] = last * 3.5;
  }
  // Fade the ends so the loop point does not click.
  const edge = Math.min(2048, Math.floor(data.length / 8));
  for (let i = 0; i < edge; i++) {
    const k = i / edge;
    data[i] *= k;
    data[data.length - 1 - i] *= k;
  }
  return buffer;
}

export function createProceduralBed(ctx: BaseAudioContext, out: AudioNode, level: number, mood: Mood, at: number): AmbientBed {
  const p = ambientParams(mood);
  const bed = ctx.createGain();
  bed.gain.setValueAtTime(0.0001, at);
  bed.gain.setTargetAtTime(level, at, 0.8); // gentle 2 to 3 second fade in
  bed.connect(out);

  // Wind: looping warm noise through a moving low-pass filter, with slow gusts.
  const wind = ctx.createBufferSource();
  wind.buffer = warmNoise(ctx, 6);
  wind.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.setValueAtTime(p.filter, at);
  windFilter.Q.value = 0.7;
  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(p.wind * (1 - p.gustDepth), at);
  const gust = ctx.createOscillator();
  gust.type = "sine";
  gust.frequency.setValueAtTime(p.gustRate, at);
  const gustDepth = ctx.createGain();
  gustDepth.gain.setValueAtTime(p.wind * p.gustDepth, at);
  gust.connect(gustDepth).connect(windGain.gain);
  const sweep = ctx.createOscillator();
  sweep.type = "sine";
  sweep.frequency.setValueAtTime(0.043, at);
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.setValueAtTime(220, at);
  sweep.connect(sweepDepth).connect(windFilter.frequency);
  wind.connect(windFilter).connect(windGain).connect(bed);

  // Room tone: two slightly detuned low notes and a fifth, softened, so it slowly breathes.
  const toneFilter = ctx.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(420, at);
  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(p.tone * 0.35 * (1 - p.pulseDepth), at);
  const tones = [
    { freq: 110, type: "triangle" as OscillatorType, level: 0.5 },
    { freq: 110.7, type: "triangle" as OscillatorType, level: 0.5 },
    { freq: 164.8, type: "sine" as OscillatorType, level: 0.3 },
  ].map(({ freq, type, level: partLevel }) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(partLevel, at);
    osc.connect(gain).connect(toneFilter);
    return osc;
  });
  toneFilter.connect(toneGain).connect(bed);
  const pulse = ctx.createOscillator();
  pulse.type = "sine";
  pulse.frequency.setValueAtTime(0.45, at);
  const pulseDepth = ctx.createGain();
  pulseDepth.gain.setValueAtTime(p.tone * 0.35 * p.pulseDepth, at);
  pulse.connect(pulseDepth).connect(toneGain.gain);

  const sources: AudioScheduledSourceNode[] = [wind, gust, sweep, pulse, ...tones];
  for (const source of sources) source.start(at);
  let stopped = false;

  return {
    kind: "procedural",
    setMood(next, when) {
      if (stopped) return;
      const q = ambientParams(next);
      windGain.gain.setTargetAtTime(q.wind * (1 - q.gustDepth), when, MOOD_GLIDE);
      gustDepth.gain.setTargetAtTime(q.wind * q.gustDepth, when, MOOD_GLIDE);
      gust.frequency.setTargetAtTime(q.gustRate, when, MOOD_GLIDE);
      windFilter.frequency.setTargetAtTime(q.filter, when, MOOD_GLIDE);
      toneGain.gain.setTargetAtTime(q.tone * 0.35 * (1 - q.pulseDepth), when, MOOD_GLIDE);
      pulseDepth.gain.setTargetAtTime(q.tone * 0.35 * q.pulseDepth, when, MOOD_GLIDE);
    },
    setLevel(next, when) {
      if (!stopped) bed.gain.setTargetAtTime(next, when, 0.3);
    },
    stop(when, fade) {
      if (stopped) return;
      stopped = true;
      bed.gain.cancelScheduledValues(when);
      bed.gain.setTargetAtTime(0, when, Math.max(0.05, fade / 3));
      for (const source of sources) source.stop(when + fade + 0.1);
    },
  };
}

/** The owner's looping file instead of the built-in bed. Mood does not change a file. */
export function createFileBed(ctx: BaseAudioContext, out: AudioNode, buffer: AudioBuffer, level: number, at: number): AmbientBed {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.setTargetAtTime(level, at, 0.7);
  gain.connect(out);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gain);
  source.start(at);
  let stopped = false;
  return {
    kind: "file",
    setMood() { /* a recorded loop does not follow the mood */ },
    setLevel(next, when) { if (!stopped) gain.gain.setTargetAtTime(next, when, 0.3); },
    stop(when, fade) {
      if (stopped) return;
      stopped = true;
      gain.gain.cancelScheduledValues(when);
      gain.gain.setTargetAtTime(0, when, Math.max(0.05, fade / 3));
      source.stop(when + fade + 0.1);
    },
  };
}
