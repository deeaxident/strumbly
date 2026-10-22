import { Heart } from "lucide-react";

import { TOP_BUTTON_CLASS } from "@/components/top-button";

const DONATE_URL = "https://buy.stripe.com/8x23co3ps4WscTjdD05ZC00";

export function DonateLink() {
  return (
    <div className="fixed left-4 top-4 z-40 sm:left-6 sm:top-6">
      <a
        href={DONATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Donate to Strumbly"
        title="Donate to Strumbly"
        className={`${TOP_BUTTON_CLASS} text-muted-foreground hover:border-primary/60 hover:text-foreground`}
      >
        <Heart className="h-4 w-4 fill-primary text-primary" aria-hidden />
      </a>
    </div>
  );
}
