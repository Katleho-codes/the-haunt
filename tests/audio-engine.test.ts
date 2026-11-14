import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundEngine, COOLDOWN_MS, CUT_FADE_SECONDS, FILE_WAIT_MS, MAX_EFFECT_SECONDS, MAX_VOICES } from "@/lib/audio/engine";
import { SOUND_EVENTS, type SoundMap } from "@/lib/audio/events";
import { GAIN_CEILING } from "@/lib/audio/levels";
// Tests use their own map with every sound built in, so editing lib/audio/sound-map.ts never changes their results.
const BUILT_IN = Object.fromEntries(SOUND_EVENTS.map((event) => [event, { file: null, gain: 1 }])) as SoundMap;
import { FakeAudioContext, FakeBufferSource, asContext } from "./audio-fake";

const ON = { effects: true, ambience: false, volume: 0.24 };
const OFF = { effects: false, ambience: false, volume: 0.24 };

function setup(options: { map?: Partial<SoundMap>; fetchFile?: (path: string) => Promise<ArrayBuffer> } = {}) {
  let clock = 1000;
  const contexts: FakeAudioContext[] = [];
  const fetchFile = vi.fn(options.fetchFile ?? (async () => new ArrayBuffer(1024)));
  const engine = new SoundEngine({
    createContext: () => {
      const ctx = new FakeAudioContext();
      contexts.push(ctx);
      return asContext(ctx);
    },
    fetchFile,
    map: { ...BUILT_IN, ...options.map } as SoundMap,
    now: () => clock,
  });
  return {
    engine,
    contexts,
    fetchFile,
    /** Moves both the cooldown clock and the audio clock. */
    advance: (ms: number) => { clock += ms; if (contexts[0]) contexts[0].currentTime += ms / 1000; },
    /** Moves only the cooldown clock: earlier sounds are still playing. */
    tick: (ms: number) => { clock += ms; },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("gate: nothing before a gesture and a switch", () => {
  it("creates no audio until unlocked, and none while both switches are off", () => {
    const { engine, contexts } = setup();
    engine.configure(ON);
    expect(engine.play("ui.click")).toEqual({ played: false, reason: "locked" });
    expect(contexts).toHaveLength(0);
    const quiet = setup();
    quiet.engine.unlock();
    quiet.engine.configure(OFF);
    expect(quiet.engine.play("ui.click")).toEqual({ played: false, reason: "muted" });
    expect(quiet.contexts).toHaveLength(0);
  });

  it("creates exactly one AudioContext however much is played", () => {
    const { engine, contexts, advance } = setup();
    engine.unlock();
    engine.configure(ON);
    for (let i = 0; i < 40; i++) {
      engine.play(SOUND_EVENTS[i % 16]);
      advance(COOLDOWN_MS + 200);
    }
    engine.configure({ ...ON, ambience: true });
    engine.configure(OFF);
    engine.configure(ON);
    expect(contexts).toHaveLength(1);
    expect(engine.contextsCreated).toBe(1);
  });

  it("a forced preview plays with interaction sounds off and is marked as forced", () => {
    const { engine } = setup();
    engine.unlock();
    engine.configure(OFF);
    expect(engine.play("commitment.save", { force: true })).toEqual({ played: true, source: "synth" });
    expect(engine.getLog()).toEqual([{ event: "commitment.save", source: "synth", forced: true }]);
  });
});

describe("limits", () => {
  it("ignores the same event again within the cooldown", () => {
    const { engine, advance } = setup();
    engine.unlock();
    engine.configure(ON);
    expect(engine.play("ui.click").played).toBe(true);
    expect(engine.play("ui.click")).toEqual({ played: false, reason: "cooldown" });
    expect(engine.play("ui.open").played).toBe(true); // other events are not affected
    advance(COOLDOWN_MS + 1);
    expect(engine.play("ui.click").played).toBe(true);
  });

  it("never rings more than the voice limit: the newest sound plays and the oldest fades out", () => {
    const { engine, tick, contexts } = setup();
    engine.unlock();
    engine.configure(ON);
    const results = [];
    for (let i = 0; i < MAX_VOICES + 3; i++) {
      results.push(engine.play(SOUND_EVENTS[i]));
      tick(COOLDOWN_MS + 1); // past the cooldown, while every earlier sound is still ringing
    }
    expect(results.every((r) => r.played)).toBe(true);
    // the three oldest voices were faded to silence to make room (built-in sounds never use linear ramps themselves)
    const faded = contexts[0].gains().filter((g) => g.gain.events.some((e) => e.kind === "linear" && e.value === 0));
    expect(faded).toHaveLength(3);
    expect(engine.getLog()).toHaveLength(MAX_VOICES + 3);
  });
  it("the same sound pressed again restarts instead of stacking on itself", () => {
    const { engine, tick, contexts } = setup();
    engine.unlock();
    engine.configure(ON);
    engine.play("commitment.delete");
    tick(COOLDOWN_MS + 1);
    engine.play("commitment.delete");
    const faded = contexts[0].gains().filter((g) => g.gain.events.some((e) => e.kind === "linear" && e.value === 0));
    expect(faded).toHaveLength(1);
    expect(engine.getLog()).toHaveLength(2);
  });
  it("never exceeds the gain ceiling, even with the highest map gain and volume", () => {
    const loud = { "commitment.save": { file: null, gain: 2 }, "ambience.bed": { file: null, gain: 2 } };
    const effects = setup({ map: loud });
    effects.engine.unlock();
    effects.engine.configure({ effects: true, ambience: false, volume: 5 });
    const before = effects.contexts[0].gains().length;
    effects.engine.play("commitment.save");
    const voiceGains = effects.contexts[0].gains().slice(before + 1); // skip the per-voice router, which stays at 1
    expect(voiceGains.length).toBeGreaterThan(0);
    for (const gain of voiceGains) expect(gain.gain.max()).toBeLessThanOrEqual(GAIN_CEILING);

    const ambient = setup({ map: loud });
    ambient.engine.unlock();
    ambient.engine.configure({ effects: false, ambience: true, volume: 5 });
    // the bed fades in with setTargetAtTime to its level; that level is the only absolute one in the bed
    const bedTargets = ambient.contexts[0].gains().flatMap((g) => g.gain.events).filter((e) => e.kind === "target");
    expect(bedTargets.length).toBeGreaterThan(0);
    for (const event of bedTargets) expect(event.value).toBeLessThanOrEqual(GAIN_CEILING);
  });
});

describe("files and fallback", () => {
  it("a press while the file is still loading waits for it, then plays the file once", async () => {
    const { engine, fetchFile } = setup({ map: { "ui.click": { file: "/audio/click.mp3", gain: 1 } } });
    engine.unlock();
    engine.configure(ON);
    expect(fetchFile).toHaveBeenCalledWith("/audio/click.mp3");
    expect(engine.status("ui.click").file.state).toBe("loading");
    expect(engine.play("ui.click")).toEqual({ played: true, source: "file" });
    expect(engine.getLog()).toEqual([]); // nothing yet: waiting for the file
    await vi.runAllTimersAsync();
    expect(engine.getLog()).toEqual([{ event: "ui.click", source: "file", forced: false }]); // once, not again at the deadline
    expect(engine.status("ui.click")).toEqual({ configured: "/audio/click.mp3", using: "file", file: { state: "ready" } });
  });

  it("falls back to the built-in sound if the file takes longer than the wait", async () => {
    let release: (value: ArrayBuffer) => void = () => {};
    const { engine } = setup({
      map: { "ui.click": { file: "/audio/slow.mp3", gain: 1 } },
      fetchFile: () => new Promise<ArrayBuffer>((resolve) => { release = resolve; }),
    });
    engine.unlock();
    engine.configure(ON);
    engine.play("ui.click");
    vi.advanceTimersByTime(FILE_WAIT_MS + 1);
    expect(engine.getLog()).toEqual([{ event: "ui.click", source: "synth", forced: false }]);
    release(new ArrayBuffer(1024));
    await vi.runAllTimersAsync();
    expect(engine.getLog()).toHaveLength(1); // the late file does not play a second sound
  });
  it("plays a decoded file through a buffer source", async () => {
    const { engine, contexts, advance } = setup({ map: { "commitment.delete": { file: "/audio/thud.mp3", gain: 1 } } });
    engine.unlock();
    engine.configure(ON);
    await vi.runAllTimersAsync();
    advance(1000);
    expect(engine.play("commitment.delete")).toEqual({ played: true, source: "file" });
    expect(contexts[0].sources().some((s) => s instanceof FakeBufferSource && s.buffer !== null && !s.loop)).toBe(true);
  });

  it("falls back to the built-in sound when a file is missing, too large or undecodable, and says why", async () => {
    const { engine } = setup({
      map: {
        "ui.open": { file: "/audio/missing.mp3", gain: 1 },
        "ui.close": { file: "/audio/huge.mp3", gain: 1 },
        "ui.toggle": { file: "/audio/broken.mp3", gain: 1 },
        "ui.navigate": { file: "/sounds/wrong-folder.mp3", gain: 1 },
      },
      fetchFile: async (path) => {
        if (path.includes("missing")) throw new Error("HTTP 404");
        if (path.includes("huge")) return new ArrayBuffer(400 * 1024);
        return new ArrayBuffer(0); // the fake cannot decode an empty file
      },
    });
    engine.unlock();
    engine.configure(ON);
    await vi.runAllTimersAsync();
    const detail = (event: "ui.open" | "ui.close" | "ui.toggle" | "ui.navigate") => {
      const file = engine.status(event).file;
      return file.state === "failed" ? file.detail : file.state;
    };
    expect(detail("ui.open")).toContain("HTTP 404");
    expect(detail("ui.close")).toContain("too large");
    expect(detail("ui.toggle")).toContain("could not decode");
    expect(detail("ui.navigate")).toContain("start with /audio/");
    for (const event of ["ui.open", "ui.close", "ui.toggle", "ui.navigate"] as const) {
      expect(engine.status(event).using).toBe("synth");
      expect(engine.play(event)).toEqual({ played: true, source: "synth" });
    }
  });

  it("does not fetch anything when every sound is built in", () => {
    const { engine, fetchFile } = setup();
    engine.unlock();
    engine.configure(ON);
    expect(fetchFile).not.toHaveBeenCalled();
  });
});

describe("ambient bed", () => {
  it("starts with the ambience switch, follows the mood and stops when switched off", () => {
    const { engine } = setup();
    engine.unlock();
    engine.configure({ ...OFF, ambience: true });
    expect(engine.debugState().ambient).toBe("procedural");
    engine.setMood("restless");
    engine.configure(OFF);
    expect(engine.debugState().ambient).toBe("off");
  });

  it("waits for a gesture when ambience was left on from a previous visit", () => {
    const { engine, contexts } = setup();
    engine.configure({ ...OFF, ambience: true });
    expect(contexts).toHaveLength(0);
    engine.unlock();
    expect(engine.debugState().ambient).toBe("procedural");
  });

  it("with an ambient file set, the built-in bed never starts: silence while loading, then the file", async () => {
    const { engine } = setup({ map: { "ambience.bed": { file: "/audio/house.mp3", gain: 1 } } });
    engine.unlock();
    engine.configure({ ...OFF, ambience: true });
    expect(engine.debugState().ambient).toBe("off");
    await vi.runAllTimersAsync();
    expect(engine.debugState().ambient).toBe("file");
  });

  it("uses the built-in bed if the ambient file fails", async () => {
    const { engine } = setup({
      map: { "ambience.bed": { file: "/audio/broken.mp3", gain: 1 } },
      fetchFile: async () => { throw new Error("HTTP 404"); },
    });
    engine.unlock();
    engine.configure({ ...OFF, ambience: true });
    await vi.runAllTimersAsync();
    expect(engine.debugState().ambient).toBe("procedural");
  });

  it("does not start a late-loading ambient file after ambience was switched off", async () => {
    const { engine } = setup({ map: { "ambience.bed": { file: "/audio/house.mp3", gain: 1 } } });
    engine.unlock();
    engine.configure({ ...OFF, ambience: true });
    engine.configure(OFF);
    await vi.runAllTimersAsync();
    expect(engine.debugState().ambient).toBe("off");
  });
  it("a preview plays for the given time and then stops, without turning ambience on", () => {
    const { engine } = setup();
    engine.unlock();
    engine.configure(OFF);
    expect(engine.previewAmbience(10).played).toBe(true);
    expect(engine.debugState().ambient).toBe("procedural");
    vi.advanceTimersByTime(9_000);
    expect(engine.debugState().ambient).toBe("procedural");
    vi.advanceTimersByTime(1_500);
    expect(engine.debugState().ambient).toBe("off");
    expect(engine.getLog().at(-1)).toEqual({ event: "ambience.bed", source: "synth", forced: true });
  });
});

describe("hidden tab", () => {
  it("fades out and suspends when hidden, refuses sounds, and resumes when visible", async () => {
    const { engine, contexts } = setup();
    engine.unlock();
    engine.configure({ ...ON, ambience: true });
    engine.setHidden(true);
    expect(engine.play("ui.click")).toEqual({ played: false, reason: "hidden" });
    vi.advanceTimersByTime(400);
    expect(contexts[0].state).toBe("suspended");
    engine.setHidden(false);
    await vi.runAllTimersAsync();
    expect(contexts[0].state).toBe("running");
    expect(engine.play("ui.click").played).toBe(true);
  });

  it("does not suspend if the tab comes back before the fade ends", () => {
    const { engine, contexts } = setup();
    engine.unlock();
    engine.configure(ON);
    engine.setHidden(true);
    engine.setHidden(false);
    vi.advanceTimersByTime(1000);
    expect(contexts[0].state).toBe("running");
  });
});

describe("one sound per press", () => {
  it("a specific sound claims the press so the generic click can skip it", () => {
    const { engine } = setup();
    engine.unlock();
    engine.configure(ON);
    engine.beginGesture();
    expect(engine.claimedThisGesture()).toBe(false);
    engine.play("commitment.save");
    expect(engine.claimedThisGesture()).toBe(true);
    engine.beginGesture();
    expect(engine.claimedThisGesture()).toBe(false);
  });

  it("claims the press even when muted, so a muted action does not fall back to a click", () => {
    const { engine } = setup();
    engine.unlock();
    engine.configure(OFF);
    engine.beginGesture();
    engine.play("commitment.delete");
    expect(engine.claimedThisGesture()).toBe(true);
  });
});

describe("log", () => {
  it("keeps event names only, and is bounded", () => {
    const { engine, advance } = setup();
    engine.unlock();
    engine.configure(ON);
    for (let i = 0; i < 260; i++) {
      engine.play("ui.click");
      advance(5000);
    }
    expect(engine.getLog().length).toBeLessThanOrEqual(200);
    expect(Object.keys(engine.getLog()[0]).sort()).toEqual(["event", "forced", "source"]);
  });
});

describe("file playback quality", () => {
  async function playFile(seconds: number, samples?: (data: Float32Array, rate: number) => void) {
    const { engine, contexts, advance } = setup({ map: { "commitment.delete": { file: "/audio/thud.mp3", gain: 1 } } });
    engine.unlock();
    engine.configure(ON);
    const ctx = contexts[0];
    ctx.decodeDuration = seconds;
    const original = ctx.decodeAudioData.bind(ctx);
    ctx.decodeAudioData = async (data: ArrayBuffer) => {
      const buffer = await original(data);
      const channel = buffer.getChannelData(0);
      if (samples) samples(channel, buffer.sampleRate);
      else channel.fill(0.5);
      return buffer;
    };
    await vi.runAllTimersAsync();
    advance(1000);
    const before = ctx.nodes.length;
    engine.play("commitment.delete");
    const added = ctx.nodes.slice(before);
    const player = added.find((n): n is FakeBufferSource => n instanceof FakeBufferSource)!;
    const gain = player.outputs[0] as unknown as { gain: { events: Array<{ kind: string; value: number; time: number }> } };
    return { player, gain: gain.gain, ctx };
  }

  it("fades a long file out over the last 0.3 s at the length limit instead of cutting it", async () => {
    const { player, gain } = await playFile(7.5);
    const start = player.startedAt!;
    expect(player.stoppedAt! - start).toBeCloseTo(MAX_EFFECT_SECONDS + 0.01, 5);
    const ramp = gain.events.find((e) => e.kind === "linear")!;
    expect(ramp.value).toBe(0);
    expect(ramp.time - start).toBeCloseTo(MAX_EFFECT_SECONDS, 5);
    const hold = gain.events.filter((e) => e.kind === "set").at(-1)!;
    expect(ramp.time - hold.time).toBeCloseTo(CUT_FADE_SECONDS, 5);
  });

  it("gives a short file a tiny end fade so it never clicks", async () => {
    const { player, gain } = await playFile(1.2);
    const ramp = gain.events.find((e) => e.kind === "linear")!;
    expect(ramp.value).toBe(0);
    expect(ramp.time - player.startedAt!).toBeCloseTo(1.2, 5);
  });

  it("skips leading silence and raises a quiet file to the common level", async () => {
    let data: Float32Array | null = null;
    const { player } = await playFile(2, (channel, rate) => {
      channel.fill(0);
      channel.fill(0.1, Math.floor(0.5 * rate)); // silent for 0.5 s, then quiet (peak 0.1)
      data = channel;
    });
    expect(player.startOffset).toBeGreaterThan(0.48);
    expect(player.startOffset).toBeLessThan(0.5);
    expect(Math.max(...data!)).toBeCloseTo(0.8, 5); // 0.1 raised by the maximum boost of 8 (target 0.9 would need 9)
  });
});
