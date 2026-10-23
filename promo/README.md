# Chorus promo video

A 50-second, 1920×1080, 30 fps motion-graphics promo for the Chrome Web Store listing, built with [Remotion](https://remotion.dev). Every cut lands on a beat of the bundled 120 BPM track, and the background glow pulses with the kick.

## Run

```sh
bun install
bun run track      # synthesises public/track.wav (no licensed audio in the repo)
bun run studio     # live preview with a timeline scrubber
bun run render     # out/chorus-promo.mp4 (H.264, CRF 17)
bun run thumbnail  # out/thumbnail.png, 1280×720 for YouTube
```

The Chrome Web Store takes a **YouTube link** for the promo video, so upload `out/chorus-promo.mp4` to YouTube (unlisted is fine) and paste the link into the listing's "Promotional video" field. Use `out/thumbnail.png` as the video's custom thumbnail.

Frame 0 of the video is the fully assembled lockup, so players that show the first frame before playback (browsers, Finder, Slack) open on the brand card rather than black. The same frame is saved as `out/poster.png` for a `<video poster="…">` attribute. `out/chorus-promo-cover.mp4` is the same video with that frame embedded as MP4 cover art for Finder and QuickTime; use the plain `out/chorus-promo.mp4` for YouTube and the web.

## Structure

| Scene | Frames | What happens |
| --- | --- | --- |
| Intro | 0–120 | Mark draws itself, wordmark letters pop, spectrum bars, zoom through the dot |
| Hook | 120–240 | "The studio Spotify forgot." slams in, feature list types out, lines split apart |
| Player bar | 240–390 | Spotify bar slides up; Chorus controls graft in one by one with LED rings; zoom into the controls button |
| Snips | 390–600 | Popover opens; handles drag to 1:07–2:06; playhead loops, snip saves |
| Speed | 600–780 | Rate counts 1.00× → 0.50× while the waveform stretches; Keep pitch flips on; key slides to +2 |
| EQ + Reverb | 780–960 | Ten bands spring into a bass boost, curve draws; rooms Studio → Concert hall → Cathedral with expanding rings |
| Vocals | 960–1110 | Waveform splits into vocals and instrumental; Instrumental → Acapella switch |
| Auto-skip | 1110–1290 | Keyword chips pop in; matching rows get stamped, struck through and collapse |
| More | 1290–1380 | Eight feature pills fly in from the edges; picture-in-picture window floats up |
| Outro | 1380–1500 | Lockup, browser pills, "Add to Chrome" pulsing on the beat |

- `src/Promo.tsx` sequences the scenes and holds `kickEnv`, which mirrors the kick pattern in `scripts/make-track.mjs`.
- `src/ui/` holds the brand mark, typography, the popover chrome and the Spotify player bar, all ported from the design canvas so the video matches the store screenshots.
- `src/anim.ts` has the spring presets (`SNAP`, `POP`, `SOFT`, `BOUNCE`) and the per-scene `useScene` / `exitStyle` helpers.

## Swapping the music

Drop any 50-second track at `public/track.wav` (or change the `staticFile` name in `Promo.tsx`). If its tempo isn't 120 BPM, update `kickEnv` so the pulse still follows the kick.

## Licence note

Remotion is free for individuals and companies of up to three people; larger companies need a company licence.
