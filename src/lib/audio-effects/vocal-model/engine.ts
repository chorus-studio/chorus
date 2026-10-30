// Snapshot separation engine — runs in the ISOLATED content-script world (where
// the extension's CSP allows WASM). Lazy-loads onnxruntime-web, obtains the MDX
// model bytes, runs the pipeline, and hands back the instrumental stem.
//
// Model access (in priority order):
//   1. Local: a file dropped at  src/public/models/<MODEL_FILE>  → served as a
//      web-accessible resource and fetched via chrome.runtime.getURL(). No CORS,
//      no network at runtime. Recommended for testing.
//   2. Download: fetched once from Hugging Face and cached in the Cache API.
//      Used only if the local file is absent.
//
// The ONNX *runtime* wasm is pulled from jsDelivr (CORS-enabled, version-pinned).

// Static import of the WebGPU bundle build (workers inlined; only the .wasm is
// fetched at runtime). Statically imported because content scripts can't reliably
// runtime-load split chunks — this bundles ORT into the content script. For
// production this engine should move to an offscreen document to avoid loading
// ORT on every Spotify page.
import * as ort from 'onnxruntime-web/webgpu'
import type { InferenceSession, Tensor } from 'onnxruntime-web'
import {
    separate,
    separateChunk,
    CHUNK,
    lastTimings,
    type SeparateResult,
    type OrtSession,
    type TensorFactory
} from './mdx'

export { CHUNK, lastTimings }
export type { StemMix } from './mix'
import { blendStems, scaleStem, type StemMix } from './mix'

// rt_core_v1: small-frame real-time MDX-Net (MIT, UVR weights). Bundled locally
// (no public download URL); drop into src/public/models/. The download fallback
// is kept only for the older HQ_3 path and won't be hit when the local file exists.
const MODEL_FILE = 'rt_core_v1.bin'
const MODEL_DOWNLOAD_URL = `https://huggingface.co/seanghay/uvr_models/resolve/main/UVR-MDX-NET-Inst_HQ_3.onnx`
const MODEL_CACHE = 'chorus-vocal-model'

export type StatusPhase = 'loading-model' | 'downloading-model' | 'separating' | 'error'
export type StatusFn = (phase: StatusPhase, detail?: { pct?: number; message?: string }) => void

let ortConfigured = false
let sessionPromise: Promise<InferenceSession> | null = null

// Runtime info surfaced to diagnostics (which execution provider actually loaded).
export const runtimeInfo = { ep: 'pending' }

function getOrt(): typeof ort {
    if (!ortConfigured) {
        // Self-hosted from the extension origin — the MV3 content-script CSP
        // (`script-src 'self'`) blocks loading the wasm-glue .mjs from a CDN.
        // Object form avoids ORT's internal prefix-joining mangling chrome-extension:// URLs.
        ort.env.wasm.wasmPaths = {
            mjs: chrome.runtime.getURL('ort/ort-wasm-simd-threaded.asyncify.mjs'),
            wasm: chrome.runtime.getURL('ort/ort-wasm-simd-threaded.asyncify.wasm')
        }
        ort.env.wasm.numThreads = 1 // Spotify pages aren't cross-origin isolated (no SAB); also keeps zero workers spawning
        ortConfigured = true
    }
    return ort
}

async function fetchModelBytes(onStatus?: StatusFn): Promise<ArrayBuffer> {
    // 1) Local web-accessible resource (preferred).
    try {
        const localUrl = chrome.runtime.getURL(`models/${MODEL_FILE}`)
        const res = await fetch(localUrl)
        if (res.ok) {
            onStatus?.('loading-model', { message: 'loading bundled model' })
            return await res.arrayBuffer()
        }
    } catch {
        // fall through to download
    }

    // 2) Cached download.
    const cache = await caches.open(MODEL_CACHE)
    const cached = await cache.match(MODEL_DOWNLOAD_URL)
    if (cached) {
        onStatus?.('loading-model', { message: 'loading cached model' })
        return await cached.arrayBuffer()
    }

    // 3) Download once, then cache.
    onStatus?.('downloading-model', { pct: 0, message: 'downloading model (~67MB, first run)' })
    const res = await fetch(MODEL_DOWNLOAD_URL)
    if (!res.ok) throw new Error(`model download failed: ${res.status}`)
    const buf = await res.arrayBuffer()
    try {
        await cache.put(
            MODEL_DOWNLOAD_URL,
            new Response(buf.slice(0), { headers: { 'content-type': 'application/octet-stream' } })
        )
    } catch {
        // caching is best-effort
    }
    return buf
}

async function getSession(onStatus?: StatusFn): Promise<InferenceSession> {
    if (!sessionPromise) {
        sessionPromise = (async () => {
            const ort = getOrt()
            const bytes = await fetchModelBytes(onStatus)
            // Real-time pipeline runs in the offscreen doc (off the page thread), so
            // WebGPU is viable and far faster for this conv-heavy model. Fall back to
            // wasm if the GPU path can't init.
            const providers = 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm']
            try {
                const s = await ort.InferenceSession.create(bytes, {
                    executionProviders: providers
                })
                runtimeInfo.ep = providers[0]
                console.log('[chorus] ORT session created with', providers[0])
                return s
            } catch (err) {
                if (providers[0] === 'webgpu') {
                    console.warn('[chorus] WebGPU init failed, falling back to wasm:', err)
                    const s = await ort.InferenceSession.create(bytes, {
                        executionProviders: ['wasm']
                    })
                    runtimeInfo.ep = 'wasm (webgpu failed)'
                    return s
                }
                throw err
            }
        })()
        sessionPromise.catch(() => {
            sessionPromise = null
        }) // allow retry after a failure
    }
    return sessionPromise
}

export type SnapshotOptions = {
    denoise?: boolean
    onStatus?: StatusFn
}

/** Separate a captured stereo snapshot (44.1kHz). Returns instrumental + vocals. */
export async function separateSnapshot(
    left: Float32Array,
    right: Float32Array,
    opts: SnapshotOptions = {}
): Promise<SeparateResult> {
    const { denoise = false, onStatus } = opts
    const ort = getOrt()
    const session = (await getSession(onStatus)) as unknown as OrtSession

    onStatus?.('separating', { pct: 0 })
    return separate(session, left, right, {
        denoise,
        createTensor: (data, dims) => new ort.Tensor('float32', data, dims) as Tensor,
        onProgress: (done, total) => onStatus?.('separating', { pct: done / total })
    })
}

/** True once a session is warm (model + runtime loaded). */
export function isModelReady(): boolean {
    return sessionPromise != null
}

/** Preload the runtime + model so the first block doesn't pay the load cost. */
export async function warmup(onStatus?: StatusFn): Promise<void> {
    await getSession(onStatus)
}

/**
 * Streaming entrypoint: separate ONE block of CHUNK samples and play it at the
 * given stem mix. The two pure stems are the model's own outputs (instrumental
 * with its volume compensation; vocals through the soft mask), so Instrumental
 * and Acapella sound as they always have; anything in between blends the
 * instrumental with what the model left out of it (mix − instrumental), which
 * gives the original back exactly at (1, 1). The blend is done here (mix and
 * stems are time-aligned) so the worklet's delay handling is unaffected.
 */
export async function runChunk(
    left: Float32Array,
    right: Float32Array,
    mix: StemMix
): Promise<{ left: Float32Array; right: Float32Array }> {
    const ort = getOrt()
    const session = (await getSession()) as unknown as OrtSession
    const createTensor: TensorFactory = (data, dims) =>
        new ort.Tensor('float32', data, dims) as Tensor

    if (mix.vocals <= 0.001) {
        const inst = await separateChunk(session, left, right, { createTensor, mode: 'remove' })
        return {
            left: scaleStem(inst.left, mix.instruments),
            right: scaleStem(inst.right, mix.instruments)
        }
    }
    if (mix.instruments <= 0.001) {
        const voc = await separateChunk(session, left, right, { createTensor, mode: 'isolate' })
        return { left: scaleStem(voc.left, mix.vocals), right: scaleStem(voc.right, mix.vocals) }
    }
    const inst = await separateChunk(session, left, right, { createTensor, mode: 'remove' })
    return { left: blendStems(left, inst.left, mix), right: blendStems(right, inst.right, mix) }
}
