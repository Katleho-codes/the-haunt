import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EFFECT_EVENTS, SOUND_EVENTS, SOUND_GROUPS, SOUND_LABELS, groupOf, isSoundEvent } from "@/lib/audio/events";
import {
  AMBIENT_MAX_BYTES, EFFECT_MAX_BYTES, TOTAL_MAX_BYTES, capFor, checkEntry, checkSizes,
} from "@/lib/audio/file-rules";
import { SOUND_MAP } from "@/lib/audio/sound-map";

describe("sound events", () => {
  it("has one map entry and one label per event, and nothing extra", () => {
    expect(Object.keys(SOUND_MAP).sort()).toEqual([...SOUND_EVENTS].sort());
    expect(Object.keys(SOUND_LABELS).sort()).toEqual([...SOUND_EVENTS].sort());
  });
  it("groups every event under the group in its name", () => {
    for (const [group, events] of Object.entries(SOUND_GROUPS)) {
      for (const event of events) expect(groupOf(event)).toBe(group);
    }
    expect(new Set(SOUND_EVENTS).size).toBe(SOUND_EVENTS.length);
    expect(EFFECT_EVENTS).not.toContain("ambience.bed");
    expect(isSoundEvent("ui.click")).toBe(true);
    expect(isSoundEvent("ui.explode")).toBe(false);
  });
});

describe("map entry rules", () => {
  it("accepts the built-in sound and normal file paths", () => {
    expect(checkEntry({ file: null, gain: 1 })).toEqual([]);
    expect(checkEntry({ file: "/audio/seal.mp3", gain: 0.8 })).toEqual([]);
    expect(checkEntry({ file: "/audio/sub/wind-loop.OGG", gain: 2 })).toEqual([]);
  });
  it.each([
    ["/sounds/seal.mp3", "start with /audio/"],
    ["/audio/../secret.mp3", ".."],
    ["/audio//seal.mp3", "//"],
    ["/audio/seal", "must end in"],
    ["/audio/seal.exe", "must end in"],
    ["/audio/my seal.mp3", "spaces"],
    ["/audio/seal.mp3?v=2", "?"],
    ["https://example.com/seal.mp3", "start with /audio/"],
  ])("rejects %s", (file, message) => {
    expect(checkEntry({ file, gain: 1 }).join(" ")).toContain(message);
  });
  it("rejects gains outside 0 to 2", () => {
    for (const gain of [-0.1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(checkEntry({ file: null, gain })).not.toEqual([]);
  });
  it("every entry in the real map is valid", () => {
    for (const event of SOUND_EVENTS) expect(checkEntry(SOUND_MAP[event]), event).toEqual([]);
  });
});

describe("file size rules", () => {
  it("uses the ambient cap only for the ambient bed", () => {
    expect(capFor("ambience.bed")).toBe(AMBIENT_MAX_BYTES);
    expect(capFor("ui.click")).toBe(EFFECT_MAX_BYTES);
  });
  it("reports missing and oversized files, and the total", () => {
    expect(checkSizes([{ event: "ui.click", file: "/audio/a.mp3", bytes: null }]).join()).toContain("does not exist");
    expect(checkSizes([{ event: "ui.click", file: "/audio/a.mp3", bytes: EFFECT_MAX_BYTES + 1 }]).join()).toContain("limit is 150 KB");
    expect(checkSizes([{ event: "ambience.bed", file: "/audio/a.mp3", bytes: 1_000_000 }])).toEqual([]); // a one-minute loop fits
    expect(checkSizes([{ event: "ui.click", file: "/audio/a.mp3", bytes: 1_000_000 }])).not.toEqual([]); // but not as an effect
    const many = Array.from({ length: 30 }, (_, i) => ({ event: "ui.click", file: `/audio/${i}.mp3`, bytes: 140 * 1024 }));
    expect(checkSizes(many).join()).toContain("all audio files together");
    expect(checkSizes([{ event: "ui.open", file: "/audio/x.mp3", bytes: 100 }, { event: "ui.close", file: "/audio/x.mp3", bytes: 100 }])).toEqual([]);
    expect(TOTAL_MAX_BYTES).toBe(4 * 1024 * 1024);
  });
});

describe("audio files on disk (same check as npm run check:audio)", () => {
  it("every file named in the map exists and is within its limit", () => {
    const sizes = SOUND_EVENTS.flatMap((event) => {
      const file = SOUND_MAP[event].file;
      if (file === null) return [];
      const path = join(process.cwd(), "public", file);
      return [{ event, file, bytes: existsSync(path) ? statSync(path).size : null }];
    });
    expect(checkSizes(sizes)).toEqual([]);
  });
});
