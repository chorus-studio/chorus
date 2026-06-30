// MDX-Net inference pipeline (UVR-compatible), ported from seanghay/uvr-mdx-infer
// and the verified test harness. Pure pre/post-processing around an
// onnxruntime-web session — the session + Tensor factory are injected so this
// module never imports onnxruntime-web directly (keeps it lazy-loadable).
//
// The model takes the one-sided complex STFT of a fixed ~5.9s chunk, cropped to
// dim_f bins, arranged as 4 channels [L-real, L-imag, R-real, R-imag], and
// returns the same shape for ONE stem. For UVR-MDX-NET-Inst_HQ_3 that stem is
// the INSTRUMENTAL; the vocal stem is recovered as (mix - instrumental).

import { stftStereo, istftStereo, hannPeriodic } from './dsp'

// rt_core_v1 — small-frame MDX-Net (MIT, from Ultimate Vocal Remover GUI).
// Extracted from Transpose's runtime config: fftSize 5120, freqBins 2048,
// timeFrames 32 (~464ms block → real-time), instrumental-direct, compensate 1.025.
// hop = block(20480) / timeFrames(32) = 640.
export const MDX_PARAMS = {
    nFft: 5120,
    hop: 640,
    dimF: 2048,
    dimT: 32,
    sampleRate: 44100,
    compensate: 1.025,
    inputName: 'input',
    primaryStem: 'instrumental'
} as const

// rt_core_v1: nFft=5120, hop=640, dimT=32 → these MUST match the constants
// hardcoded in src/public/vocal-stream-worklet.js (it can't import them).
const N_BINS = (MDX_PARAMS.nFft >> 1) + 1 // 2561
export const CHUNK = MDX_PARAMS.hop * (MDX_PARAMS.dimT - 1) // 19840
export const TRIM = MDX_PARAMS.nFft >> 1 // 2560
export const GEN = CHUNK - 2 * TRIM // 14720

// Minimal structural type for an onnxruntime-web session, to avoid importing the
// package (and its types) here.
export type OrtSession = {
    outputNames: readonly string[]
    run(feeds: Record<string, unknown>): Promise<Record<string, { data: Float32Array }>>
}
export type TensorFactory = (data: Float32Array, dims: number[]) => unknown

export type SeparateOptions = {
    createTensor: TensorFactory
    denoise?: boolean
    onProgress?: (done: number, total: number) => void
}

export type Stem = { left: Float32Array; right: Float32Array; label: string }
export type SeparateResult = { primary: Stem; complement: Stem }

// Build the [4, dimF, dimT] float32 model input from a stereo chunk.
type StereoSpec = { Lre: Float64Array; Lim: Float64Array; Rre: Float64Array; Rim: Float64Array }

// Pack one-sided stereo spectra into the model's [4, dimF, dimT] float32 input
// (channels L-re, L-im, R-re, R-im; freq cropped to dimF).
function specToTensor(s: StereoSpec): Float32Array {
    const { dimF, dimT } = MDX_PARAMS
    const chans = [s.Lre, s.Lim, s.Rre, s.Rim]
    const input = new Float32Array(4 * dimF * dimT)
    for (let ch = 0; ch < 4; ch++) {
        const src = chans[ch]
        const base = ch * dimF * dimT
        for (let fr = 0; fr < dimF; fr++) {
            const dst = base + fr * dimT
            for (let t = 0; t < dimT; t++) {
                input[dst + t] = src[t * N_BINS + fr]
            }
        }
    }
    return input
}

function chunkToTensor(left: Float64Array, right: Float64Array, window: Float64Array): Float32Array {
    const { nFft, hop } = MDX_PARAMS
    return specToTensor(stftStereo(left, right, { nFft, hop, window, center: true }))
}

// Inverse of chunkToTensor: [4, dimF, dimT] -> stereo wave [Float64(CHUNK) x2].
// Unpack the model's [4, dimF, dimT] output into one-sided (N_BINS) stereo spectra;
// bins above dimF stay zero. Channel order L-re, L-im, R-re, R-im.
function tensorToSpec(out: Float32Array): StereoSpec {
    const { dimF, dimT } = MDX_PARAMS
    const Lre = new Float64Array(N_BINS * dimT)
    const Lim = new Float64Array(N_BINS * dimT)
    const Rre = new Float64Array(N_BINS * dimT)
    const Rim = new Float64Array(N_BINS * dimT)
    const chans = [Lre, Lim, Rre, Rim]
    for (let ch = 0; ch < 4; ch++) {
        const d = chans[ch]
        const base = ch * dimF * dimT
        for (let fr = 0; fr < dimF; fr++) {
            const b = base + fr * dimT
            for (let t = 0; t < dimT; t++) {
                d[t * N_BINS + fr] = out[b + t]
            }
        }
    }
    return { Lre, Lim, Rre, Rim }
}

// Soft spectral ratio mask for the vocal stem. Starts from the residual
// voc = mix − instrumental, then attenuates each bin by how instrument-dominated
// the model thinks it is: g = |voc| / (|voc| + |inst|). This suppresses the tonal
// instrument bleed the raw time-domain residual leaves in. Reuses spectra already
// in memory (mix from input, inst from model output) → ~free besides one ISTFT.
function maskedVocalSpec(mix: StereoSpec, inst: StereoSpec): StereoSpec {
    const { dimT, nFft, sampleRate } = MDX_PARAMS
    const len = N_BINS * dimT
    const Lre = new Float64Array(len)
    const Lim = new Float64Array(len)
    const Rre = new Float64Array(len)
    const Rim = new Float64Array(len)
    const lowProtect = Math.floor((120 * nFft) / sampleRate) // keep bass (~bin 13) as-is
    const eps = 1e-10
    const floor = 0.05 // never fully gate a bin → avoids musical-noise birdies
    const apply = (
        mr: Float64Array,
        mi: Float64Array,
        ir: Float64Array,
        ii: Float64Array,
        outR: Float64Array,
        outI: Float64Array
    ) => {
        for (let i = 0; i < len; i++) {
            let vr = mr[i] - ir[i]
            let vi = mi[i] - ii[i]
            if (i % N_BINS > lowProtect) {
                const im = Math.sqrt(ir[i] * ir[i] + ii[i] * ii[i])
                const vm = Math.sqrt(vr * vr + vi * vi)
                let g = vm / (vm + im + eps)
                if (g < floor) g = floor
                vr *= g
                vi *= g
            }
            outR[i] = vr
            outI[i] = vi
        }
    }
    apply(mix.Lre, mix.Lim, inst.Lre, inst.Lim, Lre, Lim)
    apply(mix.Rre, mix.Rim, inst.Rre, inst.Rim, Rre, Rim)
    return { Lre, Lim, Rre, Rim }
}

let _cachedWindow: Float64Array | undefined
function modelWindow(): Float64Array {
    if (!_cachedWindow || _cachedWindow.length !== MDX_PARAMS.nFft) {
        _cachedWindow = hannPeriodic(MDX_PARAMS.nFft)
    }
    return _cachedWindow
}

// Legacy batch path (separate()): ISTFT the instrumental spectrum to a wave.
function tensorToChunk(out: Float32Array, window: Float64Array): [Float64Array, Float64Array] {
    const { nFft, hop, dimT } = MDX_PARAMS
    const s = tensorToSpec(out)
    const { left, right } = istftStereo(s.Lre, s.Lim, s.Rre, s.Rim, {
        nFft,
        hop,
        frames: dimT,
        bins: N_BINS,
        window,
        center: true,
        length: CHUNK
    })
    return [left, right]
}

async function runModel(
    session: OrtSession,
    createTensor: TensorFactory,
    input: Float32Array,
    denoise: boolean
): Promise<Float32Array> {
    const dims = [1, 4, MDX_PARAMS.dimF, MDX_PARAMS.dimT]
    const outName = session.outputNames[0]

    if (!denoise) {
        const r = await session.run({ [MDX_PARAMS.inputName]: createTensor(input, dims) })
        return r[outName].data
    }

    const neg = new Float32Array(input.length)
    for (let i = 0; i < input.length; i++) neg[i] = -input[i]
    const rNeg = (await session.run({ [MDX_PARAMS.inputName]: createTensor(neg, dims) }))[outName].data
    const rPos = (await session.run({ [MDX_PARAMS.inputName]: createTensor(input, dims) }))[outName].data
    const combined = new Float32Array(rPos.length)
    for (let i = 0; i < combined.length; i++) combined[i] = -rNeg[i] * 0.5 + rPos[i] * 0.5
    return combined
}

/**
 * Separate a stereo mix (44.1kHz). Returns primary (instrumental) and its
 * complement (vocals = mix - instrumental), each Float32Array of length n.
 */
// Separate ONE block of exactly CHUNK samples (stereo). Returns instrumental +
// vocals, both CHUNK-length. The streaming pipeline feeds overlapping CHUNK
// windows and keeps the middle GEN samples of each (the trim edges are the
// model's required context). This reuses the exact, validated per-chunk math.
// Per-phase timings (ms) of the last separateChunk call, for perf diagnosis.
export const lastTimings = { stft: 0, ort: 0, istft: 0 }

export async function separateChunk(
    session: OrtSession,
    leftChunk: Float32Array,
    rightChunk: Float32Array,
    opts: { createTensor: TensorFactory; mode: 'remove' | 'isolate'; denoise?: boolean }
): Promise<{ left: Float32Array; right: Float32Array }> {
    const { nFft, hop, dimT, compensate } = MDX_PARAMS
    const win = modelWindow()
    const cl = Float64Array.from(leftChunk)
    const cr = Float64Array.from(rightChunk)

    const t0 = performance.now()
    const mix = stftStereo(cl, cr, { nFft, hop, window: win, center: true })
    const input = specToTensor(mix)
    const t1 = performance.now()
    const out = await runModel(session, opts.createTensor, input, opts.denoise ?? false)
    const t2 = performance.now()

    const inst = tensorToSpec(out)
    const istftOpts = { nFft, hop, frames: dimT, bins: N_BINS, window: win, center: true, length: CHUNK }

    let left: Float32Array
    let right: Float32Array
    if (opts.mode === 'isolate') {
        // vocals: soft spectral mask on (mix − inst), then one ISTFT
        const voc = maskedVocalSpec(mix, inst)
        const w = istftStereo(voc.Lre, voc.Lim, voc.Rre, voc.Rim, istftOpts)
        left = Float32Array.from(w.left)
        right = Float32Array.from(w.right)
    } else {
        // instrumental: ISTFT the model output, with the per-model volume compensation
        const w = istftStereo(inst.Lre, inst.Lim, inst.Rre, inst.Rim, istftOpts)
        const n = w.left.length
        left = new Float32Array(n)
        right = new Float32Array(n)
        for (let i = 0; i < n; i++) {
            left[i] = w.left[i] * compensate
            right[i] = w.right[i] * compensate
        }
    }
    const t3 = performance.now()
    lastTimings.stft = t1 - t0
    lastTimings.ort = t2 - t1
    lastTimings.istft = t3 - t2
    return { left, right }
}

export async function separate(
    session: OrtSession,
    mixLeft: Float32Array,
    mixRight: Float32Array,
    opts: SeparateOptions
): Promise<SeparateResult> {
    const { createTensor, denoise = false, onProgress } = opts
    const window = hannPeriodic(MDX_PARAMS.nFft)
    const n = mixLeft.length

    const pad = GEN - (n % GEN)
    const total = TRIM + n + pad + TRIM
    const L = new Float64Array(total)
    const R = new Float64Array(total)
    L.set(mixLeft, TRIM)
    R.set(mixRight, TRIM)

    const numChunks = Math.ceil((n + pad) / GEN)
    const primL = new Float64Array(numChunks * GEN)
    const primR = new Float64Array(numChunks * GEN)

    for (let c = 0; c < numChunks; c++) {
        const i = c * GEN
        const cl = L.subarray(i, i + CHUNK)
        const cr = R.subarray(i, i + CHUNK)
        const input = chunkToTensor(cl, cr, window)
        const out = await runModel(session, createTensor, input, denoise)
        const [wl, wr] = tensorToChunk(out, window)
        for (let k = 0; k < GEN; k++) {
            primL[i + k] = wl[TRIM + k]
            primR[i + k] = wr[TRIM + k]
        }
        if (onProgress) onProgress(c + 1, numChunks)
    }

    const comp = MDX_PARAMS.compensate
    const pL = new Float32Array(n)
    const pR = new Float32Array(n)
    const vL = new Float32Array(n)
    const vR = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        const il = primL[i] * comp
        const ir = primR[i] * comp
        pL[i] = il
        pR[i] = ir
        vL[i] = mixLeft[i] - il
        vR[i] = mixRight[i] - ir
    }

    return {
        primary: { left: pL, right: pR, label: MDX_PARAMS.primaryStem },
        complement: { left: vL, right: vR, label: 'vocals' }
    }
}
