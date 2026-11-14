import { createFileBed, createProceduralBed, type AmbientBed, type Mood } from "@/lib/audio/ambient";
import type { EffectEvent, SoundEvent, SoundMap } from "@/lib/audio/events";
import { capFor, checkEntry, formatBytes } from "@/lib/audio/file-rules";
import { ambienceGain, effectGain, withEntryGain } from "@/lib/audio/levels";
import { applyScale, prepareSamples } from "@/lib/audio/prepare";
import { RECIPES } from "@/lib/audio/recipes";

/**
 * One sound engine for the whole app. It owns the only AudioContext, the output chain (master fade, limiter, shared
 * reverb), file loading with a built-in fallback, the ambient bed, and the rules:
 * - nothing is created until `unlock()` (a real user gesture) AND a sound is wanted;
 * - interaction sounds play only when they are switched on, unless a preview forces them;
 * - nothing plays while the tab is hidden;
 * - a short cooldown per event stops repeats, and at most MAX_VOICES sounds ring at once (the oldest fades for a new one).
 */

export type SoundSource = "file" | "synth";
export type RefusalReason = "locked" | "muted" | "hidden" | "cooldown" | "unsupported";
export type PlayResult = { played: true; source: SoundSource } | { played: false; reason: RefusalReason };
export type FileState =
  | { state: "builtin" }
  | { state: "loading" }
  | { state: "ready" }
  | { state: "failed"; detail: string };

/** What the debug log keeps: event names and how they played. Never any commitment text. */
export interface LogEntry {
  event: SoundEvent;
  source: SoundSource;
  forced: boolean;
}

export interface SoundSettings {
  effects: boolean;
  ambience: boolean;
  volume: number;
}

export interface EngineDeps {
  createContext: () => AudioContext | null;
  fetchFile: (path: string) => Promise<ArrayBuffer>;
  map: SoundMap;
  /** Milliseconds, for cooldowns. */
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export const COOLDOWN_MS = 60;
export const MAX_VOICES = 8;
export const LOG_LIMIT = 200;
export const MAX_EFFECT_SECONDS = 4;
/** An effect cut at MAX_EFFECT_SECONDS fades out over this long instead of stopping dead. */
export const CUT_FADE_SECONDS = 0.3;
/** Every file effect gets this short fade at its natural end, so it can never click. */
export const END_FADE_SECONDS = 0.03;
/** If a press arrives while that sound's file is still loading, wait this long for it before using the built-in one. */
export const FILE_WAIT_MS = 350;
/** How fast the oldest sound fades when a new one needs its slot. */
export const STEAL_FADE_SECONDS = 0.06;
const HIDE_FADE_MS = 300;
const REVERB_SEND = 0.22;
const AMBIENT_REVERB_SEND = 0.12;

export class SoundEngine {
  private readonly deps: Required<EngineDeps>;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private unlocked = false;
  private hidden = false;
  private settings: SoundSettings = { effects: false, ambience: false, volume: 0.24 };
  private mood: Mood = "calm";
  private bed: AmbientBed | null = null;
  private previewing = false;
  private previewTimer: unknown = null;
  private suspendTimer: unknown = null;
  private readonly lastPlayed = new Map<SoundEvent, number>();
  /** Sounds still ringing, oldest first. When all slots are used, the oldest is faded out to make room. */
  private voices: Array<{ event: SoundEvent; end: number; out: GainNode }> = [];
  private readonly buffers = new Map<SoundEvent, AudioBuffer>();
  private readonly offsets = new Map<SoundEvent, number>();
  private readonly loads = new Map<SoundEvent, Promise<void>>();
  private readonly fileStates = new Map<SoundEvent, FileState>();
  private readonly listeners = new Set<() => void>();
  private log: LogEntry[] = [];
  private version = 0;
  private gesture = 0;
  private claimedGesture = -1;
  /** How many AudioContexts this engine has created. Must never exceed one. */
  contextsCreated = 0;

  constructor(deps: EngineDeps) {
    this.deps = {
      now: () => Date.now(),
      setTimer: (callback, ms) => setTimeout(callback, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      ...deps,
    };
    for (const event of Object.keys(deps.map) as SoundEvent[]) {
      const entry = deps.map[event];
      const issues = checkEntry(entry);
      this.fileStates.set(event, entry.file === null ? { state: "builtin" } : issues.length > 0 ? { state: "failed", detail: issues[0] } : { state: "builtin" });
    }
  }

  // ---------- state for the UI ----------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  private changed(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  /** Whether an event uses the owner's file or the built-in sound, and why a file did not load. */
  status(event: SoundEvent): { configured: string | null; using: SoundSource; file: FileState } {
    const configured = this.deps.map[event].file;
    const file = this.fileStates.get(event) ?? { state: "builtin" };
    const using: SoundSource = configured !== null && file.state === "ready" ? "file" : "synth";
    return { configured, using, file };
  }

  getLog(): LogEntry[] {
    return [...this.log];
  }

  clearLog(): void {
    this.log = [];
  }

  debugState(): { unlocked: boolean; hidden: boolean; context: AudioContextState | "none"; contexts: number; ambient: "off" | "procedural" | "file" } {
    return {
      unlocked: this.unlocked,
      hidden: this.hidden,
      context: this.ctx ? this.ctx.state : "none",
      contexts: this.contextsCreated,
      ambient: this.bed ? this.bed.kind : "off",
    };
  }

  // ---------- control ----------

  /** Call from a real user gesture (pointer or key press). Browsers only allow audio after one. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.apply();
  }

  configure(settings: SoundSettings): void {
    const volumeChanged = settings.volume !== this.settings.volume;
    this.settings = { ...settings };
    this.apply();
    if (volumeChanged && this.bed && this.ctx) this.bed.setLevel(this.ambientLevel(), this.ctx.currentTime);
  }

  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (this.bed && this.ctx) this.bed.setMood(mood, this.ctx.currentTime);
  }

  setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (hidden) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      this.suspendTimer = this.deps.setTimer(() => {
        this.suspendTimer = null;
        if (this.hidden) void ctx.suspend();
      }, HIDE_FADE_MS);
    } else {
      if (this.suspendTimer !== null) {
        this.deps.clearTimer(this.suspendTimer);
        this.suspendTimer = null;
      }
      void ctx.resume().then(() => {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0.0001, ctx.currentTime);
        master.gain.setTargetAtTime(1, ctx.currentTime, 0.25);
      });
    }
    this.changed();
  }

  /** Marks the start of a click. Used so a specific sound and the generic click never both play for one press. */
  beginGesture(): void {
    this.gesture += 1;
  }

  /** True when something already asked for a sound during the current click. */
  claimedThisGesture(): boolean {
    return this.claimedGesture === this.gesture;
  }

  /**
   * Play one event. `force` is for the Sound test panel: it plays even with interaction sounds off.
   * Every call claims the current gesture, even if nothing plays, so the generic click stays silent.
   */
  play(event: SoundEvent, options: { force?: boolean } = {}): PlayResult {
    this.claimedGesture = this.gesture;
    const force = options.force === true;
    if (event === "ambience.bed") return this.previewAmbience(10);
    if (!this.unlocked) return { played: false, reason: "locked" };
    if (this.hidden) return { played: false, reason: "hidden" };
    if (!this.settings.effects && !force) return { played: false, reason: "muted" };
    const now = this.deps.now();
    const last = this.lastPlayed.get(event);
    if (last !== undefined && now - last < COOLDOWN_MS) return { played: false, reason: "cooldown" };
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsBus) return { played: false, reason: "unsupported" };
    if (ctx.state === "suspended") void ctx.resume();
    this.lastPlayed.set(event, now);
    const forced = force && !this.settings.effects;

    // The file is still on its way (usually only for the very first press): wait briefly rather than play the
    // built-in sound and then the file next time. Whichever comes first, the file or the deadline, plays once.
    const pending = this.loads.get(event);
    if (!this.buffers.has(event) && pending && this.fileStates.get(event)?.state === "loading") {
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        if (!this.hidden) this.startVoice(event, forced);
      };
      void pending.then(fire);
      this.deps.setTimer(fire, FILE_WAIT_MS);
      return { played: true, source: "file" };
    }
    return { played: true, source: this.startVoice(event, forced) };
  }

  /** Schedules one effect right now: the decoded file if there is one, otherwise the built-in recipe. */
  private startVoice(event: SoundEvent, forced: boolean): SoundSource {
    const ctx = this.ctx;
    if (!ctx || !this.effectsBus) return "synth";
    // The newest sound always plays. The same sound still ringing restarts (it does not stack on itself), and if every
    // slot is in use the oldest one fades out quickly.
    const fadeOut = (out: GainNode) => {
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
      out.gain.linearRampToValueAtTime(0, ctx.currentTime + STEAL_FADE_SECONDS);
    };
    this.voices = this.voices.filter((voice) => voice.end > ctx.currentTime);
    for (const voice of this.voices.filter((v) => v.event === event)) fadeOut(voice.out);
    this.voices = this.voices.filter((voice) => voice.event !== event);
    while (this.voices.length >= MAX_VOICES) fadeOut(this.voices.shift()!.out);
    const entry = this.deps.map[event];
    const peak = withEntryGain(effectGain(this.settings.volume), entry.gain);
    const voiceOut = ctx.createGain();
    voiceOut.gain.value = 1;
    voiceOut.connect(this.effectsBus);
    const t = ctx.currentTime + 0.005;
    const buffer = this.buffers.get(event);
    let source: SoundSource;
    let length: number;
    if (buffer) {
      const offset = Math.min(this.offsets.get(event) ?? 0, Math.max(0, buffer.duration - 0.05));
      const remaining = buffer.duration - offset;
      const cut = remaining > MAX_EFFECT_SECONDS;
      length = cut ? MAX_EFFECT_SECONDS : remaining;
      const fade = cut ? CUT_FADE_SECONDS : Math.min(END_FADE_SECONDS, length / 4);
      const player = ctx.createBufferSource();
      player.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(peak, t);
      gain.gain.setValueAtTime(peak, t + length - fade);
      gain.gain.linearRampToValueAtTime(0, t + length);
      player.connect(gain).connect(voiceOut);
      player.start(t, offset);
      player.stop(t + length + 0.01);
      source = "file";
    } else {
      length = RECIPES[event as EffectEvent]({ ctx, out: voiceOut, t, peak });
      source = "synth";
    }
    this.voices.push({ event, end: t + length, out: voiceOut });
    this.record({ event, source, forced });
    return source;
  }

  /** Plays the ambient bed for a few seconds, for the Sound test panel. Does nothing if ambience is already on. */
  previewAmbience(seconds: number): PlayResult {
    if (!this.unlocked) return { played: false, reason: "locked" };
    if (this.hidden) return { played: false, reason: "hidden" };
    const ctx = this.ensureContext();
    if (!ctx) return { played: false, reason: "unsupported" };
    if (ctx.state === "suspended") void ctx.resume();
    const source: SoundSource = this.buffers.has("ambience.bed") || this.ambientFilePending() ? "file" : "synth";
    if (this.settings.ambience) {
      this.record({ event: "ambience.bed", source, forced: false });
      return { played: true, source };
    }
    if (this.previewTimer !== null) this.deps.clearTimer(this.previewTimer);
    this.previewing = true;
    this.startAmbience();
    this.previewTimer = this.deps.setTimer(() => {
      this.previewTimer = null;
      this.previewing = false;
      if (!this.settings.ambience) this.stopAmbience(1.5);
    }, seconds * 1000);
    this.record({ event: "ambience.bed", source, forced: true });
    return { played: true, source };
  }

  isPreviewingAmbience(): boolean {
    return this.previewing;
  }

  // ---------- internals ----------

  private record(entry: LogEntry): void {
    this.log.push(entry);
    if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT);
    this.changed();
  }

  private apply(): void {
    if (!this.unlocked) return;
    const wantsSound = this.settings.effects || this.settings.ambience;
    if (wantsSound) this.ensureContext();
    if (this.settings.ambience) this.startAmbience();
    else if (!this.previewing) this.stopAmbience(1);
  }

  private ambientLevel(): number {
    return withEntryGain(ambienceGain(this.settings.volume), this.deps.map["ambience.bed"].gain);
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (this.contextsCreated > 0) return null; // never a second context, even if the first failed
    const ctx = this.deps.createContext();
    this.contextsCreated += 1;
    if (!ctx) return null;
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 1;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 2.2);
    reverb.connect(master);

    const effectsBus = ctx.createGain();
    effectsBus.connect(master);
    const effectsSend = ctx.createGain();
    effectsSend.gain.value = REVERB_SEND;
    effectsBus.connect(effectsSend).connect(reverb);

    const ambientBus = ctx.createGain();
    ambientBus.connect(master);
    const ambientSend = ctx.createGain();
    ambientSend.gain.value = AMBIENT_REVERB_SEND;
    ambientBus.connect(ambientSend).connect(reverb);

    this.master = master;
    this.effectsBus = effectsBus;
    this.ambientBus = ambientBus;
    for (const event of Object.keys(this.deps.map) as SoundEvent[]) {
      const loading = this.load(event);
      if (loading) this.loads.set(event, loading);
    }
    this.changed();
    return ctx;
  }

  /** A synthesized room: decaying stereo noise. Shared by every sound so they sit in the same space. */
  private impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    let seed = 0x7a11;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const decay = (1 - i / length) ** 3.2;
        data[i] = ((seed / 0x7fffffff) * 2 - 1) * decay * 0.6;
      }
    }
    return buffer;
  }

  /** Starts loading one file. Returns the promise, or null when there is nothing to load. */
  private load(event: SoundEvent): Promise<void> | null {
    const ctx = this.ctx;
    const path = this.deps.map[event].file;
    const current = this.fileStates.get(event);
    if (!ctx || path === null || current?.state === "failed" || current?.state === "ready" || current?.state === "loading") return null;
    this.fileStates.set(event, { state: "loading" });
    this.changed();
    return (async () => {
      try {
        const data = await this.deps.fetchFile(path);
        const cap = capFor(event);
        if (data.byteLength > cap) {
          this.fileStates.set(event, { state: "failed", detail: `too large: ${formatBytes(data.byteLength)}, the limit is ${formatBytes(cap)}` });
        } else {
          const buffer = await ctx.decodeAudioData(data);
          const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
          const isAmbient = event === "ambience.bed";
          const prepared = prepareSamples(channels, buffer.sampleRate, { trim: !isAmbient });
          applyScale(channels, prepared.scale);
          this.buffers.set(event, buffer);
          this.offsets.set(event, prepared.offset);
          this.fileStates.set(event, { state: "ready" });
        }
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : "could not load";
        this.fileStates.set(event, { state: "failed", detail: `${message}; using the built-in sound` });
      }
      if (event === "ambience.bed" && (this.settings.ambience || this.previewing)) this.startAmbience();
      this.changed();
    })();
  }

  /** True while the owner's ambient file is set and still loading: the built-in bed must not start in the meantime. */
  private ambientFilePending(): boolean {
    if (this.deps.map["ambience.bed"].file === null) return false;
    const state = this.fileStates.get("ambience.bed")?.state;
    return state !== "ready" && state !== "failed";
  }

  private startAmbience(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientBus || this.bed) return;
    if (this.ambientFilePending()) return; // starts as soon as the file is ready, or falls back if it fails
    const buffer = this.buffers.get("ambience.bed");
    this.bed = buffer
      ? createFileBed(ctx, this.ambientBus, buffer, this.ambientLevel(), ctx.currentTime)
      : createProceduralBed(ctx, this.ambientBus, this.ambientLevel(), this.mood, ctx.currentTime);
    this.changed();
  }

  private stopAmbience(fade: number): void {
    if (!this.bed || !this.ctx) return;
    this.bed.stop(this.ctx.currentTime, fade);
    this.bed = null;
    this.changed();
  }
}

