import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StringTune — Guitar Tuner" },
      { name: "description", content: "A clean, beginner-friendly guitar tuner with a live dial." },
      { property: "og:title", content: "StringTune — Guitar Tuner" },
      { property: "og:description", content: "Tune your guitar with a clean live dial." },
    ],
  }),
  component: Index,
});

const STRINGS = [
  { name: "E", octave: 2, freq: 82.41 },
  { name: "A", octave: 2, freq: 110.0 },
  { name: "D", octave: 3, freq: 146.83 },
  { name: "G", octave: 3, freq: 196.0 },
  { name: "B", octave: 3, freq: 246.94 },
  { name: "E", octave: 4, freq: 329.63 },
];

function autoCorrelate(buf: Float32Array, sr: number) {
  let rms = 0;
  for (const v of buf) rms += v * v;
  if (Math.sqrt(rms / buf.length) < 0.01) return -1;
  const n = buf.length;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i]! += buf[j]! * buf[j + i]!;
  let d = 0;
  while (d < n - 1 && c[d]! > c[d + 1]!) d++;
  let max = -1, pos = -1;
  for (let i = d; i < n; i++) if (c[i]! > max) { max = c[i]!; pos = i; }
  return pos > 0 ? sr / pos : -1;
}

function Index() {
  const [active, setActive] = useState(false);
  const [cents, setCents] = useState(0);
  const [freq, setFreq] = useState<number | null>(null);
  const [target, setTarget] = useState(STRINGS[0]!);
  const [simulated, setSimulated] = useState(false);
  const stop = useRef<() => void>(() => {});

  useEffect(() => () => stop.current(), []);

  const update = (f: number) => {
    const t = STRINGS.reduce((a, b) => (Math.abs(Math.log2(f / b.freq)) < Math.abs(Math.log2(f / a.freq)) ? b : a));
    const c = Math.max(-50, Math.min(50, 1200 * Math.log2(f / t.freq)));
    setTarget(t);
    setFreq(f);
    setCents((p) => p * 0.7 + c * 0.3);
  };

  const startSim = () => {
    setSimulated(true);
    let t = 0, idx = 0, drift = -40;
    const id = setInterval(() => {
      t++;
      if (t % 60 === 0) { idx = (idx + 1) % 6; drift = (Math.random() - 0.5) * 90; }
      drift *= 0.97;
      const c = drift + (Math.random() - 0.5) * 3;
      update(STRINGS[idx]!.freq * Math.pow(2, c / 1200));
    }, 60);
    stop.current = () => clearInterval(id);
  };

  const start = async () => {
    setActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      let raf = 0;
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        const f = autoCorrelate(buf, ctx.sampleRate);
        if (f > 60 && f < 1000) update(f);
        raf = requestAnimationFrame(loop);
      };
      loop();
      setSimulated(false);
      stop.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx.close(); };
    } catch {
      startSim();
    }
  };

  const toggle = () => {
    if (active) { stop.current(); setActive(false); setFreq(null); setCents(0); }
    else start();
  };

  const status = !freq ? "idle" : Math.abs(cents) <= 5 ? "tune" : cents < 0 ? "low" : "high";
  const label = { idle: "Play a string", tune: "In Tune", low: "Too Low", high: "Too High" }[status];
  const color = { idle: "text-muted-foreground", tune: "text-success", low: "text-low", high: "text-high" }[status];
  const stroke = { idle: "var(--muted-foreground)", tune: "var(--success)", low: "var(--low)", high: "var(--high)" }[status];
  const angle = freq ? (cents / 50) * 70 : 0;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_340px] lg:items-center">
      <section className="flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tight">
          String<span className="text-primary">Tune</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Standard tuning · E A D G B E</p>

        <div className="relative mt-8 aspect-square w-full max-w-[380px]">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <circle cx="100" cy="100" r="92" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
            <circle cx="100" cy="100" r="92" fill="none" stroke={stroke} strokeOpacity={status === "tune" ? 0.6 : 0.15} strokeWidth="3" style={{ transition: "all .3s" }} />
            {Array.from({ length: 29 }).map((_, i) => {
              const a = ((-70 + i * 5) * Math.PI) / 180;
              const major = i % 7 === 0;
              const r1 = major ? 70 : 76;
              return (
                <line key={i} x1={100 + Math.sin(a) * r1} y1={100 - Math.cos(a) * r1} x2={100 + Math.sin(a) * 82} y2={100 - Math.cos(a) * 82}
                  stroke={i === 14 ? "var(--success)" : "var(--muted-foreground)"} strokeWidth={i === 14 ? 2 : major ? 1.4 : 0.7} strokeOpacity={i === 14 ? 1 : 0.6} />
              );
            })}
            <text x="38" y="150" fontSize="7" fill="var(--low)">♭ LOW</text>
            <text x="140" y="150" fontSize="7" fill="var(--high)">HIGH ♯</text>
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "100px 100px", transition: "transform .12s linear" }}>
              <line x1="100" y1="108" x2="100" y2="26" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
            </g>
            <circle cx="100" cy="100" r="5" fill={stroke} />
          </svg>
          <div className="pointer-events-none absolute inset-x-0 bottom-[16%] text-center">
            <div className={`font-display text-5xl font-bold ${color}`}>
              {freq ? target.name : "–"}<sub className="text-lg">{freq ? target.octave : ""}</sub>
            </div>
            <div className="text-xs text-muted-foreground">{freq ? `${freq.toFixed(1)} Hz · ${cents > 0 ? "+" : ""}${cents.toFixed(0)}¢` : "—"}</div>
          </div>
        </div>

        <div className={`mt-4 font-display text-2xl font-bold ${color}`}>{label}</div>

        <button onClick={toggle}
          className={`mt-6 rounded-full px-8 py-3 font-display font-bold transition hover:scale-105 ${active ? "bg-muted text-foreground" : "bg-primary text-primary-foreground shadow-[0_0_40px_-8px_var(--primary)]"}`}>
          {active ? "Stop Microphone" : "Start Microphone"}
        </button>
        {simulated && active && <p className="mt-3 text-xs text-muted-foreground">Microphone unavailable — showing a simulation.</p>}

        <div className="mt-6 flex gap-2">
          {STRINGS.map((s, i) => (
            <div key={i} className={`grid h-10 w-10 place-items-center rounded-full border font-display text-sm ${freq && s === target ? "border-primary text-primary" : "text-muted-foreground"}`}>
              {s.name}
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-bold">New to tuning?</h2>
        <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
          {[
            ["Allow the mic", "Tap Start Microphone and allow access when your browser asks."],
            ["Pluck one string", "Play a single open string and let it ring. Keep the room quiet."],
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
          Tip: Strings from thickest to thinnest are <span className="text-foreground">E A D G B E</span> — "Eddie Ate Dynamite, Good Bye Eddie."
        </p>
      </aside>
    </main>
  );
}
