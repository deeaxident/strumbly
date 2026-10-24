import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type TuningOption = { id: string; name: string; notes: number[] };
export type TuningExamples = Record<string, string>;
export type SongResult = { song: string; artist: string; tuningName: string; presetId: string | null; notes: number[]; capo?: number };
const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const noteText = (n: number[]) => n.map((midi) => names[midi % 12] ?? "").join(" ");

export function TuningPicker({ tuning, tunings, examples, onChoose, onSearch, onSongPick, capo = 0, onCapo }: {
  tuning: TuningOption; tunings: TuningOption[]; examples: TuningExamples;
  onChoose: (tuning: TuningOption) => void;
  onSearch?: (query: string) => Promise<{ result: SongResult | null; error: string | null }>;
  onSongPick?: (song: SongResult) => void;
  capo?: number; onCapo?: (capo: number) => void;
}) {
  const [capoOpen, setCapoOpen] = useState(false);
  const capoTrigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SongResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchId = useRef(0);
  const notes = (t: TuningOption) => noteText(t.notes);
  useEffect(() => {
    if (!open && !searching && !capoOpen) return;
    // Safari may blur a clicked button with relatedTarget=null before click.
    // Close only on an actual outside interaction, not an ambiguous blur.
    const outside = (e: Event) => {
      if (e.target instanceof Node && !container.current?.contains(e.target)) { setOpen(false); setCapoOpen(false); if (searching) closeSearch(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    if (open || capoOpen) container.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open, searching, capoOpen]);

  const closeSearch = () => {
    searchId.current++;
    setSearching(false); setQuery(""); setResult(null); setError(null); setBusy(false);
  };
  const toggleSearch = () => {
    if (searching) { closeSearch(); return; }
    setOpen(false); setCapoOpen(false); setSearching(true);
    setTimeout(() => input.current?.focus(), 0);
  };
  const cache = useRef(new Map<string, { result: SongResult | null; error: string | null }>());
  const submit = async (raw = query) => {
    const q = raw.trim();
    if (q.length < 2 || !onSearch) return;
    const key = q.toLowerCase();
    const id = ++searchId.current;
    const hit = cache.current.get(key);
    if (hit) { setBusy(false); setResult(hit.result); setError(hit.error); return; }
    setBusy(true); setResult(null); setError(null);
    try {
      const r = await onSearch(q);
      if (r.result) cache.current.set(key, r);
      if (id !== searchId.current) return;
      setResult(r.result); setError(r.error);
    } catch {
      if (id === searchId.current) setError("Song search failed. Please try again in a moment.");
    } finally {
      if (id === searchId.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (!searching || query.trim().length < 3) return;
    const t = setTimeout(() => { void submit(query); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searching]);

  return (
    <div ref={container} className="relative mt-5 w-full max-w-[560px]">
      <div className="flex items-end gap-2">
        {onCapo && (
          <div className="shrink-0">
            <div id="capo-label" className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capo</div>
            <Button ref={capoTrigger} type="button" variant="ghost" aria-labelledby="capo-label capo-current" aria-haspopup="menu" aria-expanded={capoOpen}
              onClick={() => { setOpen(false); if (searching) closeSearch(); setCapoOpen((c) => !c); }}
              className="h-12 w-12 rounded-lg border border-input bg-card p-0 font-sans text-lg">
              <span id="capo-current" className={capo ? "font-bold text-primary" : "font-semibold text-muted-foreground"}>{capo ? capo : "—"}</span>
            </Button>
          </div>
        )}
        <div className="min-w-0 flex-1">
      <div id="tuning-label" className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tuning</div>
      <div className="flex">
        {searching ? (
          <form className="min-w-0 flex-1" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <input ref={input} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a song or artist..."
              aria-label="Search a song to find its tuning" maxLength={120} enterKeyHint="search"
              onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }}
              className="h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-lg" />
          </form>
        ) : (
          <Button ref={trigger} type="button" variant="ghost" aria-labelledby="tuning-label tuning-current" aria-haspopup="menu" aria-expanded={open}
            onClick={() => { setCapoOpen(false); setOpen((current) => !current); }} className="relative h-12 min-w-0 flex-1 justify-center rounded-lg border border-input bg-card px-10 py-0 text-foreground">
            <span id="tuning-current" className="min-w-0 truncate whitespace-nowrap text-center text-base font-semibold leading-none sm:text-lg">{tuning.name}</span>
            <ChevronDown aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0" />
          </Button>
        )}
      </div>
        </div>
        {onSearch && (
          <Button type="button" variant="ghost" onClick={toggleSearch} aria-label={searching ? "Close song search" : "Find tuning by song"} title={searching ? "Close search" : "Find tuning by song"}
            className="h-12 w-12 shrink-0 rounded-lg border border-input bg-card p-0 text-foreground hover:text-primary">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              {searching ? <path d="M6 6l12 12M18 6L6 18" /> : <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>}
            </svg>
          </Button>
        )}
      </div>
      {searching && (busy || result || error) && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]" aria-live="polite">
          {busy && <p className="animate-pulse px-3 py-3 text-sm text-muted-foreground motion-reduce:animate-none">Finding the tuning…</p>}
          {error && !busy && <p className="px-3 py-3 text-sm text-muted-foreground">{error}</p>}
          {result && !busy && (
            <button type="button" onClick={() => { onSongPick?.(result); closeSearch(); }}
              className="w-full rounded-md px-3 py-3 text-left transition hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
              <span className="block font-semibold text-foreground">{result.song} <span className="font-normal text-muted-foreground">— {result.artist}</span></span>
              <span className="mt-1 flex flex-wrap items-baseline gap-x-3">
                {result.tuningName.replace(/\s/g, "") !== noteText(result.notes).replace(/\s/g, "") && <span className="text-sm text-foreground">{result.tuningName}</span>}
                <span className="font-sans font-semibold text-primary">{noteText(result.notes)}</span>
                {!!result.capo && <span className="text-sm text-muted-foreground">Capo {result.capo}</span>}
              </span>
            </button>
          )}
        </div>
      )}
      {capoOpen && onCapo && (
        <div role="menu" aria-labelledby="capo-label" className="absolute left-0 top-full z-30 mt-2 max-h-[min(420px,55vh)] w-20 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]"
          onKeyDown={(e) => {
            if (e.key === "Escape") { setCapoOpen(false); capoTrigger.current?.focus(); }
            if (["ArrowDown", "ArrowUp"].includes(e.key)) {
              e.preventDefault();
              const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
              const index = items.findIndex((item) => item === document.activeElement);
              items[(index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
            }
          }}>
          {Array.from({ length: 13 }, (_, n) => (
            <Button key={n} type="button" variant="ghost" role="menuitemradio" aria-checked={n === capo} aria-label={n ? `Capo ${n}` : "No capo"}
              onClick={() => { setCapoOpen(false); capoTrigger.current?.focus(); onCapo(n); }}
              className={`h-10 w-full rounded-md font-sans font-semibold focus:bg-accent ${n ? "text-primary" : "text-muted-foreground"} ${n === capo ? "bg-accent" : ""}`}>
              {n || "—"}
            </Button>
          ))}
        </div>
      )}
      {open && !searching && (
        <div role="menu" aria-labelledby="tuning-label" className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(420px,55vh)] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]"
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); }
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
              const index = items.findIndex((item) => item === document.activeElement);
              const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
              items[next]?.focus();
            }
          }}>
          {tunings.map((option) => (
            <Button key={option.id} type="button" variant="ghost" role="menuitemradio" aria-checked={option.id === tuning.id}
              onClick={() => { setOpen(false); trigger.current?.focus(); onChoose(option); }}
              className="h-auto w-full justify-start whitespace-normal rounded-md px-3 py-3 text-left text-foreground focus:bg-accent">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold">{option.name}</span>
                  <span className="font-sans font-semibold text-primary">{notes(option)}</span>
                </span>
                <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{examples[option.id]}</span>
              </span>
              {option.id === tuning.id && <Check aria-hidden className="text-primary" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
