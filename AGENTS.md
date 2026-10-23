<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules

- Theme switching works by toggling a `.dark` class on `<html>`; every colour lives as a token in `src/styles.css` and components use semantic token classes only, so light and dark stay in sync without per-component branches.
- Server-rendered SVG geometry must be rounded to a fixed number of decimals before it goes into JSX, because unrounded trig output differs in the last digits between runtimes and breaks hydration.
- The tuning picker uses an accessible button-based menu with outside pointerdown/focusin dismissal, not blur dismissal, so multi-line details render consistently and Safari null-relatedTarget blur cannot cancel item clicks.
- Microphone sessions use a generation guard to discard pending permissions after stopping; reference playback stops capture before producing audio to prevent self-detection.
- Load Tone.js dynamically in the browser-only guitar playback module; use licensed CDN sample pointers and dispose playback on unmount to keep SSR audio-free.
- Keep pitch analysis in a pure, reusable normalized autocorrelation detector with bounded downsampled lag search; clamp only needle position, never reported cents.
- Song-to-tuning lookup runs server-side through a server function calling the AI gateway with a strict schema; results are validated (6 MIDI notes) and custom tunings are pinned at the top of the picker, so the client never sees the API key and the audio/mic code needs no changes.
