import { describe, expect, it } from "vitest";
import { ambientParams, createFileBed, createProceduralBed, type Mood } from "@/lib/audio/ambient";
import { EFFECT_EVENTS } from "@/lib/audio/events";
import { RECIPES } from "@/lib/audio/recipes";
import { FakeAudioContext, FakeBuffer, FakeGain, FakeNode, FakeOscillator, FakeParam, FakeSource, asContext, asNode } from "./audio-fake";

/** Can a signal from `from` reach `to` through node connections? */
function reaches(from: FakeNode, to: FakeNode): boolean {
  const seen = new Set<FakeNode>();
  const queue: FakeNode[] = [from];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === to) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of node.outputs) if (next instanceof FakeNode) queue.push(next);
  }
  return false;
}

describe("built-in sounds", () => {
  const T = 2;
  const PEAK = 0.05;

  it("exist for every interaction event", () => {
    expect(Object.keys(RECIPES).sort()).toEqual([...EFFECT_EVENTS].sort());
  });

  it.each(EFFECT_EVENTS)("%s is short, never louder than its peak, and fully routed", (event) => {
    const ctx = new FakeAudioContext();
    const out = ctx.createGain();
    const length = RECIPES[event]({ ctx: asContext(ctx), out: asNode(out), t: T, peak: PEAK });
    expect(length).toBeGreaterThan(0.02);
    expect(length).toBeLessThan(1);
    const sources = ctx.sources();
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.startedAt).not.toBeNull();
      expect(source.startedAt!).toBeGreaterThanOrEqual(T);
      expect(source.stoppedAt).not.toBeNull();
      expect(source.stoppedAt!).toBeLessThanOrEqual(T + 1);
      expect(reaches(source, out)).toBe(true);
    }
    for (const gain of ctx.gains().filter((g) => g !== out)) expect(gain.gain.max()).toBeLessThanOrEqual(PEAK + 1e-12);
  });

  it("sound different from each other", () => {
    const signature = (event: (typeof EFFECT_EVENTS)[number]) => {
      const ctx = new FakeAudioContext();
      RECIPES[event]({ ctx: asContext(ctx), out: asNode(ctx.createGain()), t: 0, peak: 0.05 });
      return ctx.nodes
        .map((n) => (n instanceof FakeOscillator ? `o${n.type}${n.frequency.events[0]?.value}` : "frequency" in n ? `f${(n as unknown as { type: string; frequency: FakeParam }).type}${(n as unknown as { frequency: FakeParam }).frequency.events[0]?.value}` : n.kind))
        .join("|");
    };
    const all = EFFECT_EVENTS.map(signature);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("ambient bed", () => {
  it("gets busier, brighter and gustier as the house gets restless, and only restless pulses", () => {
    const calm = ambientParams("calm");
    const watchful = ambientParams("watchful");
    const restless = ambientParams("restless");
    for (const key of ["wind", "gustDepth", "gustRate", "filter"] as const) {
      expect(watchful[key]).toBeGreaterThan(calm[key]);
      expect(restless[key]).toBeGreaterThan(watchful[key]);
    }
    expect(calm.pulseDepth).toBe(0);
    expect(watchful.pulseDepth).toBe(0);
    expect(restless.pulseDepth).toBeGreaterThan(0);
    for (const mood of ["calm", "watchful", "restless"] as Mood[]) {
      const p = ambientParams(mood);
      for (const value of [p.wind, p.gustDepth, p.tone, p.pulseDepth]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
  });

  it("is wind and room tone only, fades in to its level, and never runs a level above it", () => {
    const ctx = new FakeAudioContext();
    const out = ctx.createGain();
    const LEVEL = 0.03;
    createProceduralBed(asContext(ctx), asNode(out), LEVEL, "restless", 1);
    const sources = ctx.sources();
    const kinds = sources.map((s) => s.kind).sort();
    // one looping noise source (wind), and oscillators (room tone and slow modulators). Nothing else.
    expect(kinds.filter((k) => k === "buffer-source")).toHaveLength(1);
    expect(sources.every((s) => s.startedAt === 1)).toBe(true);
    const bedGain = ctx.gains().find((g) => g.outputs.includes(out))!;
    expect(bedGain.gain.events[0]).toMatchObject({ kind: "set", value: 0.0001 }); // starts silent
    expect(bedGain.gain.max()).toBeLessThanOrEqual(LEVEL);
    // every gain that carries audio stays at or below 1 of the bed; the 220 Hz filter sweep is a frequency modulator.
    for (const gain of ctx.gains()) {
      const modulatesFrequency = gain.outputs.some((o) => o instanceof FakeParam && o.value > 100);
      if (!modulatesFrequency) expect(gain.gain.max()).toBeLessThanOrEqual(1);
    }
    for (const source of sources) expect(reaches(source as FakeNode, out) || source.outputs.some((o) => o instanceof FakeNode)).toBe(true);
  });

  it("glides to a new mood and stops every source when stopped", () => {
    const ctx = new FakeAudioContext();
    const out = ctx.createGain();
    const bed = createProceduralBed(asContext(ctx), asNode(out), 0.03, "calm", 0);
    const glides = () => ctx.nodes.flatMap((n) => Object.values(n).filter((v): v is FakeParam => v instanceof FakeParam)).flatMap((p) => p.events).filter((e) => e.kind === "target").length;
    const before = glides();
    bed.setMood("restless", 5);
    expect(glides()).toBeGreaterThan(before + 4);
    bed.stop(6, 1);
    expect(ctx.sources().every((s: FakeSource) => s.stoppedAt === 7.1)).toBe(true);
    bed.setMood("calm", 8); // ignored after stop
    bed.stop(9, 1); // safe to call twice
  });

  it("a file bed loops the owner's file at the given level", () => {
    const ctx = new FakeAudioContext();
    const out = ctx.createGain();
    const buffer = new FakeBuffer(2, 8000 * 60, 8000);
    const bed = createFileBed(asContext(ctx), asNode(out), buffer as unknown as AudioBuffer, 0.02, 0);
    const [source] = ctx.sources() as Array<FakeSource & { loop: boolean; buffer: unknown }>;
    expect(bed.kind).toBe("file");
    expect(source.loop).toBe(true);
    expect(source.buffer).toBe(buffer);
    expect((ctx.gains().find((g) => g.outputs.includes(out)) as FakeGain).gain.max()).toBeLessThanOrEqual(0.02);
  });
});
