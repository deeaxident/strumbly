import { describe, expect, it } from "vitest";
import { createPitchDetector, describePitch, noteFromMidi } from "./pitch";

describe("raw guitar pitch detection", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const midi of [35, 38, 40, 45, 50, 55, 59, 64]) {
      it(`detects guitar MIDI ${midi} at ${sampleRate} Hz within two cents`, () => {
        const frequency = noteFromMidi(midi).freq * 2 ** (17 / 1200);
        const buffer = Float32Array.from({ length: 4096 }, (_, i) => {
          const phase = 2 * Math.PI * frequency * i / sampleRate;
          return 0.2 * Math.sin(phase) + 0.1 * Math.sin(2 * phase) + 0.06 * Math.sin(3 * phase);
        });
        const detected = createPitchDetector(buffer.length, sampleRate)(buffer);
        expect(detected).not.toBeNull();
        expect(Math.abs(1200 * Math.log2((detected ?? 1) / frequency))).toBeLessThan(2);
      });
    }
  }
  it("ignores silence and nonperiodic noise", () => {
    const detect = createPitchDetector(4096, 48000);
    expect(detect(new Float32Array(4096))).toBeNull();
    let seed = 1;
    const noise = Float32Array.from({ length: 4096 }, () => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647 - 0.5) * 0.1;
    });
    expect(detect(noise)).toBeNull();
  });
});

it("reports nearest note separately from target string, without clipping cents", () => {
  const result = describePitch(noteFromMidi(41).freq, [40, 45, 50, 55, 59, 64]);
  expect(result.nearestNote).toBe("F");
  expect(result.targetIndex).toBe(0);
  expect(result.cents).toBeCloseTo(100);
});

it("targets the low D string in Drop D and preserves negative cents", () => {
  const result = describePitch(noteFromMidi(38).freq * 2 ** (-23 / 1200), [38, 45, 50, 55, 59, 64]);
  expect(result.targetIndex).toBe(0);
  expect(result.nearestNote).toBe("D");
  expect(result.cents).toBeCloseTo(-23);
});
it("folds a low E heard only as its 2nd harmonic back down to the low E string", async () => {
  const { correctOctave } = await import("./pitch");
  const standard = [40, 45, 50, 55, 59, 64];
  expect(correctOctave(noteFromMidi(52).freq, standard)).toBeCloseTo(noteFromMidi(40).freq);
  expect(correctOctave(noteFromMidi(64).freq, standard)).toBeCloseTo(noteFromMidi(64).freq);
  expect(correctOctave(noteFromMidi(41).freq, standard)).toBeCloseTo(noteFromMidi(41).freq);
});
