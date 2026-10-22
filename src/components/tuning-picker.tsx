import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type TuningOption = { id: string; name: string; free: boolean; notes: number[] };
export type TuningExamples = Record<string, string>;
const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function TuningPicker({ tuning, tunings, examples, onChoose }: {
  tuning: TuningOption; tunings: TuningOption[]; examples: TuningExamples;
  onChoose: (tuning: TuningOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const notes = (t: TuningOption) => t.notes.map((midi) => names[midi % 12] ?? "").join(" ");
  useEffect(() => {
    if (!open) return;
    // Safari may blur a clicked button with relatedTarget=null before click.
    // Close only on an actual outside interaction, not an ambiguous blur.
    const outside = (e: Event) => {
      if (e.target instanceof Node && !container.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    container.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);

  return (
    <div ref={container} className="relative mt-5 w-full max-w-[560px]">
      <div id="tuning-label" className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tuning</div>
      <Button ref={trigger} type="button" variant="ghost" aria-labelledby="tuning-label tuning-current" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((current) => !current)} className="h-auto min-h-12 w-full justify-between gap-3 rounded-lg border border-input bg-card px-4 py-3 text-foreground">
        <span id="tuning-current" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-left">
          <span className="text-base font-semibold">{tuning.name}</span>
          <span className="font-sans text-base font-semibold text-primary">{notes(tuning)}</span>
        </span>
        <ChevronDown aria-hidden className="shrink-0" />
      </Button>
      {open && (
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
              {option.free ? option.id === tuning.id && <Check aria-hidden className="text-primary" /> : <Lock aria-label="Pro tuning" className="text-muted-foreground" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}