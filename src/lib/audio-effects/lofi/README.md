# lovelofi effects (vendored copy)

A byte-identical copy of files from the lovelofi monorepo
(`github.com/lovelofi/app`, `packages/shared/src`), in the same relative layout
so their imports work unchanged. Taken at commit `9764a46` on 2026-10-26.
Nothing in this folder is edited; Chorus-specific code lives beside it
(`../lofi-rack.ts`) and in `$lib/stores/lofi.ts` and
`$lib/audio-effects/quick-presets.ts`. A sync is a copy and a diff:

    LOVELOFI=~/funspace/lovelofi/app/packages/shared/src
    (cd src/lib/audio-effects/lofi && find . -name '*.ts') | while read -r f; do
        cp "$LOVELOFI/$f" "src/lib/audio-effects/lofi/$f"
    done
    for w in bitcrusher dropout pitch-wobble stereo-drift vocal-cut; do
        cp "$LOVELOFI/worklets/$w-processor.js" src/public/worklets/
    done
    cp ~/funspace/lovelofi/app/apps/ext/public/sounds/vinyl-crackle.mp3 src/public/sounds/

Left out on purpose:

- `audio/effects/slowdown.ts` and `worklets/slowdown-processor.js`. lovelofi can
  only see captured audio, so it re-reads a ring buffer at a fractional speed
  and skips ahead whenever the writer laps it. Chorus owns the media element
  and sets its playback rate instead; a preset's `slowdown` intensity becomes
  `rate = 1 - intensity / 200` with the pitch following (see `quick-presets.ts`).
- `audio/gen-effect-rack.ts`. It hard-codes relative asset paths that would
  404 inside the Spotify page; `../lofi-rack.ts` is the Chorus rack.
- Everything else in the package: storage, licensing, UI, the preset catalogue
  fetcher. `constants.ts` and `preset-library.ts` are here for the 28 built-in
  presets and their sections; the rest of their exports go unused.

The `*.test.ts` files run under `bun run test` against the Web Audio mocks in
`src/test/setup.ts`, also copied from lovelofi.
