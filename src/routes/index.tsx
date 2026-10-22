import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TuningPicker } from "@/components/tuning-picker";
import { createPitchDetector, describePitch, noteFromMidi } from "@/lib/pitch";
import { disposeGuitarAudio, playGuitarNote, stopGuitarNote } from "@/lib/guitar-audio";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Strumbly — Free Online Guitar Tuner with Microphone" },
      { name: "description", content: "Tune your guitar online for free with Strumbly. Real-time microphone pitch detection shows exact cents off, plus real acoustic guitar reference notes for Standard, Drop D, DADGAD, Open G and more tunings." },
      { property: "og:title", content: "Strumbly — Free Online Guitar Tuner" },
      { property: "og:description", content: "Free online guitar tuner with real-time microphone pitch detection and real acoustic guitar reference notes. Standard, Drop D, DADGAD, Open G and more." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://strumbly.io/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://strumbly.io/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Strumbly",
          url: "https://strumbly.io/",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any",
          description: "Free online guitar tuner with real-time microphone pitch detection and acoustic guitar reference notes for Standard, Drop D, DADGAD, Open G and more tunings.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: Index,
});

type Tuning = { id: string; name: string; notes: number[] };
const TUNINGS: Tuning[] = [
  { id: "standard", name: "Standard", notes: [40, 45, 50, 55, 59, 64] },
  { id: "dropd", name: "Drop D", notes: [38, 45, 50, 55, 59, 64] },
  { id: "halfdown", name: "Half Step Down", notes: [39, 44, 49, 54, 58, 63] },
  { id: "fulldown", name: "Full Step Down", notes: [38, 43, 48, 53, 57, 62] },
  { id: "dropc", name: "Drop C", notes: [36, 43, 48, 53, 57, 62] },
  { id: "dropb", name: "Drop B", notes: [35, 42, 47, 52, 56, 61] },
  { id: "dadgad", name: "DADGAD", notes: [38, 45, 50, 55, 57, 62] },
  { id: "openg", name: "Open G", notes: [38, 43, 50, 55, 59, 62] },
  { id: "opend", name: "Open D", notes: [38, 45, 50, 54, 57, 62] },
  { id: "opene", name: "Open E", notes: [40, 47, 52, 56, 59, 64] },
  { id: "openc", name: "Open C", notes: [36, 43, 48, 55, 60, 64] },
];

const TUNING_EXAMPLES: Record<string, string> = {
  standard: "Eric Clapton · Rock, blues, pop",
  dropd: "Jimmy Page, Dave Grohl · Rock, alternative rock, metal",
  halfdown: "Jimi Hendrix, Stevie Ray Vaughan · Blues, rock",
  fulldown: "Tony Iommi · Metal, hard rock",
  dropc: "James Hetfield, Daron Malakian · Metal, hard rock",
  dropb: "Victor Griffin · Doom metal, hard rock",
  dadgad: "Jimmy Page · Folk, acoustic, folk rock",
  openg: "Keith Richards · Rock, blues",
  opend: "Bob Dylan · Folk, blues",
  opene: "Keith Richards · Blues, rock",
  openc: "John Butler, Devin Townsend · Fingerstyle, progressive metal",
};

export function Index() {
  const [tuning, setTuning] = useState<Tuning>(TUNINGS[0] ?? { id: "standard", name: "Standard", notes: [40, 45, 50, 55, 59, 64] });
  const strings = tuning.notes.map(noteFromMidi);
  const notesRef = useRef(tuning.notes);
  notesRef.current = tuning.notes;
  const [active, setActive] = useState(false);
  const [cents, setCents] = useState(0);
  const [freq, setFreq] = useState<number | null>(null);
  const [targetIdx, setTargetIdx] = useState(0);
  const [nearestNote, setNearestNote] = useState("–");
  const [micError, setMicError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const stop = useRef<() => void>(() => {});
  const microphoneSession = useRef(0);
  const playbackSession = useRef(0);
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = strings[targetIdx] ?? strings[0];

  useEffect(() => () => {
    microphoneSession.current++;
    playbackSession.current++;
    stop.current();
    if (playbackTimer.current) clearTimeout(playbackTimer.current);
    disposeGuitarAudio();
  }, []);

  const update = (f: number) => {
    const result = describePitch(f, notesRef.current);
    setTargetIdx(result.targetIndex);
    setNearestNote(result.nearestNote);
    setFreq(f);
    setCents(result.cents);
  };

  const start = async () => {
    const session = ++microphoneSession.current;
    playbackSession.current++;
    stopGuitarNote();
    setPlaying(null);
    setLoadingNote(null);
    setAudioError(null);
    setMicError(null);
    setActive(true);
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (session !== microphoneSession.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      ctx = new AudioContext();
      const audioContext = ctx;
      const microphone = stream;
      const an = ctx.createAnalyser();
      an.fftSize = 4096;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(an);
      const buf = new Float32Array(an.fftSize);
      const detectPitch = createPitchDetector(buf.length, ctx.sampleRate);
      let raf = 0;
      let lastRead = -Infinity, lastPitch = performance.now();
      const loop = (now: number) => {
        if (session !== microphoneSession.current) return;
        raf = requestAnimationFrame(loop);
        if (now - lastRead < 45) return;
        lastRead = now;
        an.getFloatTimeDomainData(buf);
        const f = detectPitch(buf);
        if (f !== null && f >= 50 && f <= 1000) { update(f); lastPitch = now; }
        else if (now - lastPitch > 350) { setFreq(null); setCents(0); }
      };
      stop.current = () => { cancelAnimationFrame(raf); microphone.getTracks().forEach((t) => t.stop()); source.disconnect(); an.disconnect(); void audioContext.close(); };
      await ctx.resume();
      if (session !== microphoneSession.current) return;
      loop(performance.now());
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (ctx && ctx.state !== "closed") void ctx.close();
      if (session === microphoneSession.current) {
        stop.current();
        stop.current = () => {};
        setActive(false);
        const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
        setMicError(denied ? "Microphone access was denied. Allow access in your browser, then try again." : "Microphone unavailable. Check that a microphone is connected, then try again.");
      }
    }
  };

  const stopMicrophone = () => {
    microphoneSession.current++;
    stop.current();
    stop.current = () => {};
    setActive(false);
    setMicError(null);
    setFreq(null);
    setCents(0);
  };

  const toggle = () => {
    if (active) stopMicrophone();
    else start();
  };

  const choose = (t: Tuning) => {
    playbackSession.current++;
    stopGuitarNote();
    setPlaying(null);
    setLoadingNote(null);
    setTuning(t);
    setTargetIdx(0);
    setFreq(null);
    setCents(0);
  };

  const listen = async (i: number) => {
    stopMicrophone();
    const midi = tuning.notes[i];
    if (midi === undefined) return;
    const session = ++playbackSession.current;
    const isCurrent = () => session === playbackSession.current;
    stopGuitarNote();
    if (playbackTimer.current) clearTimeout(playbackTimer.current);
    setPlaying(null);
    setLoadingNote(i);
    setAudioError(null);
    try {
      const played = await playGuitarNote(midi, isCurrent);
      if (!played || !isCurrent()) return;
      setLoadingNote(null);
      setPlaying(i);
      playbackTimer.current = setTimeout(() => { if (isCurrent()) setPlaying(null); }, 3000);
    } catch {
      if (!isCurrent()) return;
      setLoadingNote(null);
      setAudioError("Guitar recording couldn't load. Check your connection and tap a note to retry.");
    }
  };

  const status = !freq ? "idle" : Math.abs(cents) <= 5 ? "tune" : cents < 0 ? "low" : "high";
  const label = { idle: "Play a string", tune: "In Tune", low: "Too Low", high: "Too High" }[status];
  const color = { idle: "text-muted-foreground", tune: "text-success", low: "text-low", high: "text-high" }[status];
  const stroke = { idle: "var(--muted-foreground)", tune: "var(--success)", low: "var(--low)", high: "var(--high)" }[status];
  const needleX = 200 + (Math.max(-50, Math.min(50, freq ? cents : 0)) / 50) * 160;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 pb-10 pt-16 lg:grid-cols-[1fr_340px] lg:items-center lg:pt-10">
      <section className="flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Strum<span className="text-primary">bly</span>
        </h1>

        <TuningPicker tuning={tuning} tunings={TUNINGS} examples={TUNING_EXAMPLES} onChoose={choose} />

        <div className="mt-5 grid w-full max-w-[328px] grid-cols-6 gap-2" role="group" aria-label="Reference notes">
          {strings.map((s, i) => (
            <Button variant="ghost" key={i} onClick={() => void listen(i)} aria-label={`Play string ${6 - i}: ${s.name}`} aria-pressed={playing === i} aria-busy={loadingNote === i}
              className={`grid aspect-square h-auto w-full place-items-center rounded-full border p-0 font-sans text-base transition hover:border-primary hover:text-primary ${playing === i ? "scale-110 border-primary bg-accent font-bold text-primary" : "font-semibold text-foreground"}`}>
              <span className={loadingNote === i ? "animate-pulse motion-reduce:animate-none" : ""}>{s.name}</span>
            </Button>
          ))}
        </div>


        <div className="relative mt-8 w-full max-w-[560px]">
          <svg viewBox="0 0 400 170" className="h-auto w-full">
            {/* Panel */}
            <rect x="1.5" y="1.5" width="397" height="167" rx="18" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
            <rect x="1.5" y="1.5" width="397" height="167" rx="18" fill="none" stroke={stroke} strokeOpacity={status === "tune" ? 0.6 : 0.15} strokeWidth="2.5" style={{ transition: "all .3s" }} />
            {/* Dial window */}
            <rect x="24" y="20" width="352" height="62" rx="9" fill="var(--muted)" fillOpacity="0.45" />
            {/* Scale ticks */}
            {Array.from({ length: 21 }).map((_, i) => {
              const x = (40 + i * 16).toFixed(3);
              const major = i % 5 === 0;
              const v = -50 + i * 5;
              return (
                <g key={i}>
                  <line x1={x} y1="28" x2={x} y2={major ? "48" : "41"}
                    stroke={i === 10 ? "var(--success)" : "var(--muted-foreground)"} strokeWidth={i === 10 ? 2 : major ? 1.4 : 0.7} strokeOpacity={i === 10 ? 1 : 0.65} />
                  {major && (
                    <text x={x} y="74" textAnchor="middle" fontSize="10" fill={i === 10 ? "var(--success)" : "var(--muted-foreground)"}>
                      {v > 0 ? `+${v}` : v}
                    </text>
                  )}
                </g>
              );
            })}
            <text x="34" y="96" fontSize="9" fill="var(--low)">♭ LOW</text>
            <text x="366" y="96" textAnchor="end" fontSize="9" fill="var(--high)">HIGH ♯</text>
            {/* Sliding needle */}
            <g style={{ transform: `translateX(${(needleX - 200).toFixed(3)}px)`, transition: "transform .12s linear" }}>
              <polygon points="200,12 194,4 206,4" fill={stroke} />
              <line x1="200" y1="12" x2="200" y2="88" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
            </g>
            {/* Note readout */}
            <text x="200" y="136" textAnchor="middle" fontSize="38" fontWeight="700" fill="var(--foreground)" className="font-display">
              {freq ? nearestNote : "–"}
            </text>
            <text x="200" y="160" textAnchor="middle" fontSize="11" fill="var(--foreground)" fillOpacity="0.7">
              {freq ? `${freq.toFixed(1)} Hz · ${cents >= 0 ? "+" : "−"}${Math.abs(cents).toFixed(1)}¢` : "—"}
            </text>
          </svg>
        </div>

        <div aria-live="polite" className="mt-4 min-h-14 text-center">
          <div className={`font-display text-2xl font-bold ${color}`}>{freq ? label : ""}</div>
          {freq && <p className="text-sm text-muted-foreground">Target: String {6 - targetIdx} · <span className="font-semibold text-foreground">{target?.name}</span></p>}
        </div>

        <Button onClick={toggle}
          className={`mt-6 h-auto rounded-full px-8 py-3 font-display font-bold transition hover:scale-105 ${active ? "bg-muted text-foreground" : "bg-primary text-primary-foreground shadow-[0_0_40px_-8px_var(--primary)]"}`}>
          {active ? "Stop Microphone" : "Start Microphone"}
        </Button>
        {micError && <p role="alert" className="mt-3 max-w-sm text-center text-sm text-high">{micError}</p>}
        {audioError && <p role="alert" className="mt-3 max-w-sm text-center text-sm text-high">{audioError}</p>}
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Guitar samples: <a className="underline underline-offset-2 hover:text-foreground" href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noreferrer">Nicholas Brosowsky / Iowa</a>
          {" · "}<a className="underline underline-offset-2 hover:text-foreground" href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>
        </p>

      </section>

      <aside className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-bold">New to tuning?</h2>
        <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
          {[
            ["Pick a tuning", "Standard is the most common. Drop D is great for rock."],
            ["Listen first", "Tap a string button to hear how it should sound."],
            ["Allow the mic", "Tap Start Microphone and allow access when your browser asks."],
            ["Read the needle", "Left means Too Low, right means Too High. The center is perfect."],
            ["Turn the peg", "Too low? Tighten the peg. Too high? Loosen it. Small turns!"],
            ["Go green", "When the dial turns green, that string is In Tune. Move to the next."],
          ].map(([t, d], i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent font-display text-xs text-primary">{i + 1}</span>
              <span><strong className="text-foreground">{t}.</strong> {d}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Tip: Standard strings from thickest to thinnest are <span className="text-foreground">E A D G B E</span> — "Eddie Ate Dynamite, Good Bye Eddie."
        </p>
      </aside>

    </main>
  );
}
