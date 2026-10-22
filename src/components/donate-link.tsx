import { Heart } from "lucide-react";

const DONATE_URL = "https://buy.stripe.com/8x23co3ps4WscTjdD05ZC00";

export function DonateLink() {
  return (
    <div className="fixed left-4 top-4 z-40 sm:left-6 sm:top-6">
      <a
        href={DONATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Donate to Strumbly"
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/85 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-soft)] backdrop-blur transition hover:text-foreground"
      >
        <Heart className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
        <span className="hidden sm:inline">Donate</span>
      </a>
    </div>
  );
}
