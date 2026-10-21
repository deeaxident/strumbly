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
- The tuning picker uses an accessible button-based menu so multi-line note and artist details render consistently across desktop and mobile native-select limitations.
- Microphone sessions use a generation guard to discard pending permissions after stopping; reference playback stops capture before producing audio to prevent self-detection.
