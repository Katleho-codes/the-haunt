import { describe, expect, it } from "vitest";
import { MAX_BOOST, MAX_TRIM_SECONDS, ONSET_LEAD_SECONDS, TARGET_PEAK, applyScale, prepareSamples } from "@/lib/audio/prepare";

const RATE = 1000;
const signal = (seconds: number, startAt: number, level: number) => {
  const data = new Float32Array(Math.round(seconds * RATE));
  data.fill(level, Math.round(startAt * RATE));
  return data;
};

describe("preparing a file", () => {
  it("scales any file so its loudest sample reaches the common level", () => {
    for (const peak of [1.02, 0.57, 0.3]) {
      const data = signal(1, 0, peak);
      const { scale } = prepareSamples([data], RATE, { trim: true });
      applyScale([data], scale);
      expect(Math.max(...data)).toBeCloseTo(TARGET_PEAK, 5);
    }
  });
  it("raises very quiet files by at most the maximum boost", () => {
    const data = signal(1, 0, 0.02);
    const { scale } = prepareSamples([data], RATE, { trim: true });
    expect(scale).toBe(MAX_BOOST);
  });
  it("leaves a fully silent file alone", () => {
    expect(prepareSamples([new Float32Array(500)], RATE, { trim: true })).toEqual({ scale: 1, offset: 0, peak: 0 });
  });
  it("starts at the first audible sample, a few ms early, across channels", () => {
    const left = signal(2, 0.526, 0.9);
    const right = signal(2, 0.4, 0.9);
    const { offset } = prepareSamples([left, right], RATE, { trim: true });
    expect(offset).toBeCloseTo(0.4 - ONSET_LEAD_SECONDS, 5);
  });
  it("ignores low noise below the threshold when finding the start", () => {
    const data = signal(2, 0.3, 0.9);
    data.fill(0.01, 0, Math.round(0.3 * RATE)); // hiss at about 1% of the peak
    expect(prepareSamples([data], RATE, { trim: true }).offset).toBeCloseTo(0.3 - ONSET_LEAD_SECONDS, 5);
  });
  it("never skips more than the maximum, and never trims an ambient loop", () => {
    expect(prepareSamples([signal(4, 2.5, 0.9)], RATE, { trim: true }).offset).toBe(MAX_TRIM_SECONDS);
    expect(prepareSamples([signal(4, 0.5, 0.9)], RATE, { trim: false }).offset).toBe(0);
  });
});
