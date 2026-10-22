import e2 from "@/assets/guitar/E2.mp3.asset.json";
import a2 from "@/assets/guitar/A2.mp3.asset.json";
import d3 from "@/assets/guitar/D3.mp3.asset.json";
import g3 from "@/assets/guitar/G3.mp3.asset.json";
import b3 from "@/assets/guitar/B3.mp3.asset.json";
import e4 from "@/assets/guitar/E4.mp3.asset.json";
import type { Sampler } from "tone";

let sampler: Sampler | null = null;
let loading: Promise<Sampler> | null = null;
let generation = 0;

export async function playGuitarNote(midi: number, isCurrent: () => boolean) {
  // No Tone.js runtime import during SSR: Web Audio is only created after a user gesture.
  const Tone = await import("tone");
  await Tone.start();
  if (!isCurrent()) return false;
  if (!loading) {
    const session = generation;
    loading = new Promise<Sampler>((resolve, reject) => {
      const instrument = new Tone.Sampler({
        urls: { E2: e2.url, A2: a2.url, D3: d3.url, G3: g3.url, B3: b3.url, E4: e4.url },
        attack: 0.005,
        release: 0.5,
        volume: -6,
        onload: () => {
          if (session !== generation) { instrument.dispose(); reject(new Error("Playback cancelled")); return; }
          resolve(instrument);
        },
        onerror: (error) => { instrument.dispose(); sampler = null; loading = null; reject(error); },
      }).toDestination();
      sampler = instrument;
    });
  }
  const instrument = await loading;
  if (!isCurrent()) return false;
  instrument.releaseAll();
  // Tone's MIDI conversion retains octave internally; the interface still shows plain note names.
  instrument.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), 2.5);
  return true;
}

export function stopGuitarNote() { sampler?.releaseAll(); }

export function disposeGuitarAudio() {
  generation++;
  sampler?.dispose();
  sampler = null;
  loading = null;
}