# Chorus brand assets

The mark is a "C" built from three phase-offset arcs radiating from one voice dot:
one voice becoming many, which is what a chorus effect does. Arcs are Spotify
green `#1ED760`, the voice dot is white on dark surfaces and ink `#121212` on
light ones. The mono grey `#8A8A8A` set is used by the toolbar when Chorus is off.

## Files

| File | Use |
| --- | --- |
| `logo-mark.svg` | Master mark, regular weight. 48 px and up, dark backgrounds. |
| `logo-mark-on-light.svg` | Same mark for light backgrounds (deeper green, ink dot). |
| `logo-mark-glyph.svg` | Single-colour glyph for 48 px toolbar/management icons. |
| `logo-mark-small.svg` | Heavier weight for 32 px toolbar icons. |
| `logo-mark-16.svg` | 16 px toolbar icon: one arc plus the dot. |
| `logo-tile-dark.svg` | Store icon: dark rounded tile with an 8 px transparent margin. |
| `logo-tile-green.svg` | Green tile variant for social avatars. |
| `wordmark-dark.svg` | Horizontal lock-up. Type is Space Grotesk 700; the SVG falls back to Helvetica Neue / Arial when the font is not installed. |
| `store/small-tile-440x280.*` | Chrome Web Store small promo tile. |
| `store/marquee-1400x560.*` | Chrome Web Store marquee promo tile. |
| `store/icon-128.png`, `store/icon-512.png` | Store listing icons (Chrome Web Store and Firefox Add-ons). |

## Regenerating the PNGs

The extension icons in `src/public/icon/` (and the `disabled/` grey set) plus the
store PNGs are rendered from these SVGs with `@resvg/resvg-js`. The build script
used for the current set lives outside the repo; any SVG rasteriser works:

- `16.png` ← `logo-mark-16.svg`
- `32.png` ← `logo-mark-small.svg`
- `48.png` ← `logo-mark-glyph.svg`
- `96.png`, `128.png` ← `logo-tile-dark.svg`
- `disabled/*.png` ← the same sources with every colour replaced by `#8A8A8A`

## Rules

- Keep clear space equal to the dot's diameter on every side.
- Never rotate, outline, add a gradient to, or recolour the mark outside green,
  white, ink or the mono grey.
- In product UI, use the inline `Logo.svelte` component rather than a PNG so the
  mark stays crisp at any size.
