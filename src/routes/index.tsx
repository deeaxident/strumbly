import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Strumbly — Guitar Tuner" },
      { name: "description", content: "A clean, beginner-friendly guitar tuner with a live dial and reference tones for popular tunings." },
      { property: "og:title", content: "Strumbly — Guitar Tuner" },
      { property: "og:description", content: "Tune your guitar with a clean live dial and reference tones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const note = (midi: number) => ({
  name: NAMES[midi % 12]!,
  octave: Math.floor(midi / 12) - 1,
  freq: 440 * Math.pow(2, (midi - 69) / 12),
});

type Tuning = { id: string; name: string; free: boolean; notes: number[] };
const TUNINGS: Tuning[] = [
  { id: "standard", name: "Standard", free: true, notes: [40, 45, 50, 55, 59, 64] },
  { id: "dropd", name: "Drop D", free: true, notes: [38, 45, 50, 55, 59, 64] },
  { id: "halfdown", name: "Half Step Down", free: false, notes: [39, 44, 49, 54, 58, 63] },
  { id: "fulldown", name: "Full Step Down", free: false, notes: [38, 43, 48, 53, 57, 62] },
  { id: "dropc", name: "Drop C", free: false, notes: [36, 43, 48, 53, 57, 62] },
  { id: "dropb", name: "Drop B", free: false, notes: [35, 42, 47, 52, 56, 61] },
  { id: "dadgad", name: "DADGAD", free: false, notes: [38, 45, 50, 55, 57, 62] },
  { id: "openg", name: "Open G", free: false, notes: [38, 43, 50, 55, 59, 62] },
  { id: "opend", name: "Open D", free: false, notes: [38, 45, 50, 54, 57, 62] },
  { id: "opene", name: "Open E", free: false, notes: [40, 47, 52, 56, 59, 64] },
  { id: "openc", name: "Open C", free: false, notes: [36, 43, 48, 55, 60, 64] },
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

let toneCtx: AudioContext | null = null;
function playTone(freq: number) {
  toneCtx ??= new AudioContext();
  const ctx = toneCtx;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
  master.connect(ctx.destination);
  [1, 2, 3, 4].forEach((h, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = i === 0 ? "triangle" : "sine";
    o.frequency.value = freq * h;
    g.gain.value = [1, 0.5, 0.25, 0.12][i]!;
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + 2.6);
  });
}

function Index() {
  const [tuning, setTuning] = useState(TUNINGS[0]!);
  const strings = tuning.notes.map(note);
  const stringsRef = useRef(strings);
  stringsRef.current = strings;
  const [active, setActive] = useState(false);
  const [cents, setCents] = useState(0);
  const [freq, setFreq] = useState<number | null>(null);
  const [targetIdx, setTargetIdx] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const [locked, setLocked] = useState<Tuning | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [showOctave, setShowOctave] = useState(true);
  const stop = useRef<() => void>(() => {});
  const target = strings[targetIdx]!;

  useEffect(() => () => stop.current(), []);

  const update = (f: number) => {
    const s = stringsRef.current;
    let best = 0;
    s.forEach((b, i) => { if (Math.abs(Math.log2(f / b.freq)) < Math.abs(Math.log2(f / s[best]!.freq))) best = i; });
    const c = Math.max(-50, Math.min(50, 1200 * Math.log2(f / s[best]!.freq)));
    setTargetIdx(best);
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
      update(stringsRef.current[idx]!.freq * Math.pow(2, c / 1200));
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
        if (f > 50 && f < 1000) update(f);
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

  const choose = (t: Tuning) => {
    if (!t.free) return setLocked(t);
    setTuning(t);
    setFreq(null);
    setCents(0);
  };

  const listen = (i: number) => {
    playTone(strings[i]!.freq);
    setPlaying(i);
    setTimeout(() => setPlaying((p) => (p === i ? null : p)), 1200);
  };

  const status = !freq ? "idle" : Math.abs(cents) <= 5 ? "tune" : cents < 0 ? "low" : "high";
  const label = { idle: "Play a string", tune: "In Tune", low: "Too Low", high: "Too High" }[status];
  const color = { idle: "text-muted-foreground", tune: "text-success", low: "text-low", high: "text-high" }[status];
  const stroke = { idle: "var(--muted-foreground)", tune: "var(--success)", low: "var(--low)", high: "var(--high)" }[status];
  const needleX = 200 + ((freq ? cents : 0) / 50) * 160;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 pb-10 pt-16 lg:grid-cols-[1fr_340px] lg:items-center lg:pt-10">
      <section className="flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Strum<span className="text-primary">bly</span>
        </h1>

        <div className="mt-5 w-full max-w-[280px]">
          <label htmlFor="tuning-select" className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tuning
          </label>
          <div className="relative">
            <select
              id="tuning-select"
              value={tuning.id}
              onChange={(e) => choose(TUNINGS.find((t) => t.id === e.target.value) ?? tuning)}
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-input bg-card px-4 pr-10 text-base font-medium text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <optgroup label="Free">
                {TUNINGS.filter((t) => t.free).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
              <optgroup label="Pro">
                {TUNINGS.filter((t) => !t.free).map((t) => (
                  <option key={t.id} value={t.id}>🔒 {t.name}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="mt-3 text-center font-display text-lg font-semibold tracking-[0.12em] text-foreground">
            {strings.map((s) => (showOctave ? `${s.name}${s.octave}` : s.name)).join(" ")}
          </p>
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
              {freq ? target.name : "–"}
              {freq && showOctave && <tspan fontSize="18" fill="var(--foreground)" fillOpacity="0.75" dy="10">{target.octave}</tspan>}
            </text>
            <text x="200" y="160" textAnchor="middle" fontSize="11" fill="var(--foreground)" fillOpacity="0.7">
              {freq ? `${freq.toFixed(1)} Hz · ${cents > 0 ? "+" : ""}${cents.toFixed(0)}¢` : "—"}
            </text>
          </svg>
        </div>

        <div className={`mt-4 font-display text-2xl font-bold ${color}`}>{label}</div>

        <button onClick={toggle}
          className={`mt-6 rounded-full px-8 py-3 font-display font-bold transition hover:scale-105 ${active ? "bg-muted text-foreground" : "bg-primary text-primary-foreground shadow-[0_0_40px_-8px_var(--primary)]"}`}>
          {active ? "Stop Microphone" : "Start Microphone"}
        </button>
        {simulated && active && <p className="mt-3 text-xs text-muted-foreground">Microphone unavailable — showing a simulation.</p>}

        <p className="mt-6 text-xs text-muted-foreground">Tap a string to hear its note</p>
        <div className="mt-2 flex gap-2">
          {strings.map((s, i) => (
            <button key={i} onClick={() => listen(i)} aria-label={`Play ${s.name}${s.octave}`}
              className={`grid h-12 w-12 place-items-center rounded-full border text-base transition hover:border-primary hover:text-primary ${playing === i ? "scale-110 border-primary bg-accent font-bold text-primary" : freq && i === targetIdx ? "border-primary font-semibold text-foreground" : "font-semibold text-foreground"}`}>
              <span>{s.name}{showOctave && <sub className="text-[10px] font-normal text-foreground/70">{s.octave}</sub>}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Switch id="octave-toggle" checked={showOctave} onCheckedChange={setShowOctave} aria-label="Toggle octave numbers"
            className="data-[state=unchecked]:bg-muted data-[state=unchecked]:border data-[state=unchecked]:border-border" />
          <label htmlFor="octave-toggle" className="cursor-pointer select-none text-sm text-muted-foreground">Show octave numbers</label>
        </div>
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

      {locked && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-5 backdrop-blur" onClick={() => setLocked(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl">🔒</div>
            <h3 className="mt-2 text-xl font-bold">{locked.name} is a Pro tuning</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upgrade to Strumbly Pro to unlock {TUNINGS.filter((t) => !t.free).length} extra tunings like Drop C, DADGAD and Open G.
            </p>
            <button disabled className="mt-5 w-full rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground opacity-60">
              Subscriptions coming soon
            </button>
            <button onClick={() => setLocked(null)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">Maybe later</button>
          </div>
        </div>
      )}
    </main>
  );
}
