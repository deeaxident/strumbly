import { afterEach, expect, it, vi } from "vitest";

const audio = vi.hoisted(() => ({ options: null as Record<string, unknown> | null, start: vi.fn(), attack: vi.fn(), release: vi.fn(), dispose: vi.fn() }));
vi.mock("tone", () => ({
  start: audio.start,
  Frequency: (midi: number) => ({ toNote: () => midi === 38 ? "D2" : "E2" }),
  Sampler: class {
    constructor(options: Record<string, unknown>) { audio.options = options; queueMicrotask(() => (options["onload"] as () => void)()); }
    toDestination() { return this; }
    triggerAttackRelease = audio.attack;
    releaseAll = audio.release;
    dispose = audio.dispose;
  },
}));

import { disposeGuitarAudio, playGuitarNote } from "./guitar-audio";
afterEach(() => { disposeGuitarAudio(); vi.clearAllMocks(); });

it("maps all six recorded open strings into Tone.Sampler and plays MIDI notes", async () => {
  expect(await playGuitarNote(40, () => true)).toBe(true);
  expect(Object.keys(audio.options?.["urls"] ?? {})).toEqual(["E2", "A2", "D3", "G3", "B3", "E4"]);
  for (const url of Object.values(audio.options?.["urls"] ?? {})) expect(url).toMatch(/^\/__l5e\/assets-v1\//);
  expect(audio.attack).toHaveBeenCalledWith("E2", 2.5);
});

it("pitch shifts the low guitar sample to Drop D", async () => {
  await playGuitarNote(38, () => true);
  expect(audio.attack).toHaveBeenCalledWith("D2", 2.5);
});

it("does not play a stale note after microphone capture starts", async () => {
  let current = true;
  const pending = playGuitarNote(40, () => current);
  current = false;
  expect(await pending).toBe(false);
  expect(audio.attack).not.toHaveBeenCalled();
});