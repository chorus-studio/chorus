// Fetches the vocal-separation model into src/public/models/ when it's missing.
//
// rt_core_v1.bin (~50 MiB) is gitignored — too large to live in the repo — so a
// clean checkout (CI, a fresh clone) has no copy and the Chrome build would ship
// without it. The WXT `build:before` hook in wxt.config.ts calls ensureModel()
// for non-Firefox targets: it downloads the file from a GitHub release asset and
// verifies size + SHA-256 before putting it in place. Checkouts that already have
// the file skip the download entirely.
//
// Manual run:   bun scripts/fetch-model.ts
// Override the source (e.g. a local server while testing):
//   CHORUS_MODEL_URL=http://127.0.0.1:8000/rt_core_v1.bin bun scripts/fetch-model.ts
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const MODEL_FILE = 'rt_core_v1.bin'
export const MODEL_PATH = resolve(root, 'src/public/models', MODEL_FILE)

// Pinned so a corrupted or swapped download can never silently end up in a release.
const MODEL_BYTES = 52_786_724
const MODEL_SHA256 = '8303cb0e37fc3d301130745502c9a82a4f650ee129897bdb1525914bda7af72e'
const MODEL_URL =
    'https://github.com/chorus-studio/chorus/releases/download/model-rt_core_v1/rt_core_v1.bin'

type Options = { url?: string; log?: (msg: string) => void }

export async function ensureModel({
    url = process.env.CHORUS_MODEL_URL || MODEL_URL,
    log = console.log
}: Options = {}): Promise<string> {
    if (existsSync(MODEL_PATH)) return MODEL_PATH

    log(`[fetch-model] ${MODEL_FILE} missing — downloading from ${url}`)
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(
            `[fetch-model] download failed: HTTP ${res.status} ${res.statusText} (${url})`
        )
    }
    const buf = Buffer.from(await res.arrayBuffer())

    if (buf.byteLength !== MODEL_BYTES) {
        throw new Error(
            `[fetch-model] size mismatch: got ${buf.byteLength} bytes, expected ${MODEL_BYTES}`
        )
    }
    const sha256 = createHash('sha256').update(buf).digest('hex')
    if (sha256 !== MODEL_SHA256) {
        throw new Error(`[fetch-model] sha256 mismatch: got ${sha256}, expected ${MODEL_SHA256}`)
    }

    // Write under a sibling temp name (still matches the *.bin gitignore) and rename,
    // so a crash mid-write can never leave a truncated rt_core_v1.bin behind.
    mkdirSync(dirname(MODEL_PATH), { recursive: true })
    const tmp = MODEL_PATH.replace(/\.bin$/, '.part.bin')
    writeFileSync(tmp, buf)
    renameSync(tmp, MODEL_PATH)
    log(`[fetch-model] saved ${(buf.byteLength / 1048576).toFixed(1)} MiB → ${MODEL_PATH}`)
    return MODEL_PATH
}

// CLI entry: `bun scripts/fetch-model.ts`
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    ensureModel().catch((err: unknown) => {
        console.error(err instanceof Error ? err.message : err)
        process.exit(1)
    })
}
