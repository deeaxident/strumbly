/**
 * The two controls pinned to the top corners of every screen (donate on the
 * left, theme switch on the right) must stay the same size and shape so they
 * balance each other. Both pull their box from this one class string: a compact
 * icon-only square, so the icon sits close to the border.
 */
export const TOP_BUTTON_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/85 shadow-[var(--shadow-soft)] backdrop-blur transition";
