# Vocal-separation model (not committed)

The real-time separator runs `rt_core_v1.bin` (~50 MiB, MIT — see `rt_core_v1.LICENSE`).
It is gitignored because it is too large for the repo, so it is provisioned at build time:

- `wxt.config.ts` calls `scripts/fetch-model.ts` from the `build:before` hook for
  non-Firefox targets. If `src/public/models/rt_core_v1.bin` is missing, it is downloaded
  from the GitHub release asset and verified (size + SHA-256) before being written here.
- If the file is already present, nothing is downloaded.
- Manual run: `bun scripts/fetch-model.ts` (override the source with `CHORUS_MODEL_URL=...`).

The build copies `src/public/*` into the extension and the manifest exposes `/models/*` as a
web-accessible resource, so the engine loads it via
`chrome.runtime.getURL('models/rt_core_v1.bin')`. Firefox builds strip this directory
entirely (no offscreen API there), and the sources zip submitted to AMO excludes `*.bin`.

The engine's runtime download fallback (Hugging Face, `UVR-MDX-NET-Inst_HQ_3.onnx`) is a
legacy path from before `rt_core_v1`; its framing constants do not match, so the bundled
file must be present in Chrome builds.
