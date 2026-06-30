// DSP core for the MDX-Net snapshot separator (ported from the verified test
// harness; unit-tested to ~1e-13 reconstruction error).
//
// Replicates the pieces of torch.stft / torch.istft that UVR's MDX pipeline
// relies on. n_fft for these models is 6144 (NOT a power of two), so a plain
// radix-2 FFT is wrapped with Bluestein's algorithm for arbitrary sizes.
// Float64 throughout for accuracy.

const TAU = Math.PI * 2

function nextPow2(n: number): number {
    let p = 1
    while (p < n) p <<= 1
    return p
}

// In-place iterative radix-2 Cooley-Tukey FFT. inverse=true also scales by 1/n.
export function fftRadix2(re: Float64Array, im: Float64Array, inverse: boolean): void {
    const n = re.length

    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1
        for (; j & bit; bit >>= 1) j ^= bit
        j ^= bit
        if (i < j) {
            const tr = re[i]
            re[i] = re[j]
            re[j] = tr
            const ti = im[i]
            im[i] = im[j]
            im[j] = ti
        }
    }

    for (let len = 2; len <= n; len <<= 1) {
        const ang = ((inverse ? 1 : -1) * TAU) / len
        const wRe = Math.cos(ang)
        const wIm = Math.sin(ang)
        const half = len >> 1
        for (let i = 0; i < n; i += len) {
            let curRe = 1
            let curIm = 0
            for (let k = 0; k < half; k++) {
                const a = i + k
                const b = a + half
                const bRe = re[b] * curRe - im[b] * curIm
                const bIm = re[b] * curIm + im[b] * curRe
                re[b] = re[a] - bRe
                im[b] = im[a] - bIm
                re[a] += bRe
                im[a] += bIm
                const nRe = curRe * wRe - curIm * wIm
                curIm = curRe * wIm + curIm * wRe
                curRe = nRe
            }
        }
    }

    if (inverse) {
        const inv = 1 / n
        for (let i = 0; i < n; i++) {
            re[i] *= inv
            im[i] *= inv
        }
    }
}

export type Complex = { re: Float64Array; im: Float64Array }

// Arbitrary-length DFT via Bluestein's algorithm. Precomputes chirp + filter
// spectrum once per size, so each transform is two pow2 FFTs.
export class FFT {
    readonly n: number
    private readonly M: number
    private readonly wRe: Float64Array
    private readonly wIm: Float64Array
    private readonly bRe: Float64Array
    private readonly bIm: Float64Array
    private readonly _aRe: Float64Array
    private readonly _aIm: Float64Array

    constructor(n: number) {
        this.n = n
        const M = (this.M = nextPow2(2 * n - 1))

        const wRe = (this.wRe = new Float64Array(n))
        const wIm = (this.wIm = new Float64Array(n))
        for (let k = 0; k < n; k++) {
            const k2 = (k * k) % (2 * n)
            const ang = (-Math.PI * k2) / n
            wRe[k] = Math.cos(ang)
            wIm[k] = Math.sin(ang)
        }

        const bRe = (this.bRe = new Float64Array(M))
        const bIm = (this.bIm = new Float64Array(M))
        bRe[0] = wRe[0]
        bIm[0] = -wIm[0]
        for (let k = 1; k < n; k++) {
            const re = wRe[k]
            const im = -wIm[k]
            bRe[k] = re
            bIm[k] = im
            bRe[M - k] = re
            bIm[M - k] = im
        }
        fftRadix2(bRe, bIm, false)

        this._aRe = new Float64Array(M)
        this._aIm = new Float64Array(M)
    }

    private _forward(xRe: Float64Array, xIm: Float64Array | null): Complex {
        const { n, M, wRe, wIm, bRe, bIm, _aRe: aRe, _aIm: aIm } = this
        aRe.fill(0)
        aIm.fill(0)

        for (let k = 0; k < n; k++) {
            const xr = xRe[k]
            const xi = xIm ? xIm[k] : 0
            aRe[k] = xr * wRe[k] - xi * wIm[k]
            aIm[k] = xr * wIm[k] + xi * wRe[k]
        }

        fftRadix2(aRe, aIm, false)
        for (let j = 0; j < M; j++) {
            const pr = aRe[j] * bRe[j] - aIm[j] * bIm[j]
            const pi = aRe[j] * bIm[j] + aIm[j] * bRe[j]
            aRe[j] = pr
            aIm[j] = pi
        }
        fftRadix2(aRe, aIm, true)

        const outRe = new Float64Array(n)
        const outIm = new Float64Array(n)
        for (let k = 0; k < n; k++) {
            outRe[k] = aRe[k] * wRe[k] - aIm[k] * wIm[k]
            outIm[k] = aRe[k] * wIm[k] + aIm[k] * wRe[k]
        }
        return { re: outRe, im: outIm }
    }

    transform(xRe: Float64Array, xIm: Float64Array | null, inverse: boolean): Complex {
        if (!inverse) return this._forward(xRe, xIm)

        const n = this.n
        const conjIm = new Float64Array(n)
        for (let k = 0; k < n; k++) conjIm[k] = xIm ? -xIm[k] : 0
        const { re, im } = this._forward(xRe, conjIm)
        const inv = 1 / n
        for (let k = 0; k < n; k++) {
            re[k] *= inv
            im[k] *= -inv
        }
        return { re, im }
    }
}

// Periodic Hann window (matches torch.hann_window(periodic=True)).
export function hannPeriodic(n: number): Float64Array {
    const w = new Float64Array(n)
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((TAU * i) / n)
    return w
}

// numpy-style 'reflect' padding (edge sample not repeated), p samples each side.
export function reflectPad(x: ArrayLike<number>, p: number): Float64Array {
    const n = x.length
    const out = new Float64Array(n + 2 * p)
    for (let i = 0; i < n; i++) out[p + i] = x[i]
    for (let i = 0; i < p; i++) {
        out[p - 1 - i] = x[i + 1]
        out[p + n + i] = x[n - 2 - i]
    }
    return out
}

export type StftOptions = {
    nFft: number
    hop: number
    window?: Float64Array
    center?: boolean
}

export type Spectrogram = { re: Float64Array; im: Float64Array; frames: number; bins: number }

// One-sided STFT, frame-major: bin b of frame f at f*(n/2+1)+b.
export function stft(signal: ArrayLike<number>, opts: StftOptions): Spectrogram {
    const { nFft, hop, center = true } = opts
    const win = opts.window || hannPeriodic(nFft)
    const padded = center ? reflectPad(signal, nFft >> 1) : Float64Array.from(signal as number[])
    const frames = 1 + Math.floor((padded.length - nFft) / hop)
    const bins = (nFft >> 1) + 1
    const fft = new FFT(nFft)

    const outRe = new Float64Array(bins * frames)
    const outIm = new Float64Array(bins * frames)
    const frameRe = new Float64Array(nFft)
    const frameIm = new Float64Array(nFft)

    for (let f = 0; f < frames; f++) {
        const start = f * hop
        for (let i = 0; i < nFft; i++) frameRe[i] = padded[start + i] * win[i]
        frameIm.fill(0)
        const { re, im } = fft.transform(frameRe, frameIm, false)
        const o = f * bins
        for (let b = 0; b < bins; b++) {
            outRe[o + b] = re[b]
            outIm[o + b] = im[b]
        }
    }
    return { re: outRe, im: outIm, frames, bins }
}

export type IstftOptions = {
    nFft: number
    hop: number
    window?: Float64Array
    center?: boolean
    length?: number | null
}

// Inverse of stft(). `length`, if given, trims/pads to exactly that many samples.
export function istft(spec: Spectrogram, opts: IstftOptions): Float64Array {
    const { re, im, frames, bins } = spec
    const { nFft, hop, center = true, length = null } = opts
    const win = opts.window || hannPeriodic(nFft)
    const fft = new FFT(nFft)

    const outLen = (frames - 1) * hop + nFft
    const acc = new Float64Array(outLen)
    const wenv = new Float64Array(outLen)

    const fullRe = new Float64Array(nFft)
    const fullIm = new Float64Array(nFft)

    for (let f = 0; f < frames; f++) {
        const o = f * bins
        for (let b = 0; b < bins; b++) {
            fullRe[b] = re[o + b]
            fullIm[b] = im[o + b]
        }
        for (let b = bins; b < nFft; b++) {
            const m = nFft - b
            fullRe[b] = re[o + m]
            fullIm[b] = -im[o + m]
        }
        const time = fft.transform(fullRe, fullIm, true)
        const start = f * hop
        for (let i = 0; i < nFft; i++) {
            const w = win[i]
            acc[start + i] += time.re[i] * w
            wenv[start + i] += w * w
        }
    }

    for (let i = 0; i < outLen; i++) {
        if (wenv[i] > 1e-10) acc[i] /= wenv[i]
    }

    let result = acc
    if (center) {
        const p = nFft >> 1
        result = acc.subarray(p, outLen - p)
    }
    if (length != null) {
        const trimmed = new Float64Array(length)
        trimmed.set(result.subarray(0, Math.min(length, result.length)))
        return trimmed
    }
    return Float64Array.from(result)
}

// Cache FFT instances (the Bluestein precompute is reusable per size).
const _fftCache = new Map<number, FFT>()
function getFFT(n: number): FFT {
    let f = _fftCache.get(n)
    if (!f) {
        f = new FFT(n)
        _fftCache.set(n, f)
    }
    return f
}

export type StereoSpectrogram = {
    Lre: Float64Array
    Lim: Float64Array
    Rre: Float64Array
    Rim: Float64Array
    frames: number
    bins: number
}

// Stereo STFT via the two-reals-in-one-complex-FFT trick: pack z = L + iR and do
// ONE complex FFT per frame instead of two real ones (verified identical to
// stft(L)+stft(R)). Returns one-sided L/R spectra.
export function stftStereo(
    left: ArrayLike<number>,
    right: ArrayLike<number>,
    opts: StftOptions
): StereoSpectrogram {
    const { nFft, hop, center = true } = opts
    const win = opts.window || hannPeriodic(nFft)
    const padL = center ? reflectPad(left, nFft >> 1) : Float64Array.from(left as number[])
    const padR = center ? reflectPad(right, nFft >> 1) : Float64Array.from(right as number[])
    const frames = 1 + Math.floor((padL.length - nFft) / hop)
    const bins = (nFft >> 1) + 1
    const fft = getFFT(nFft)
    const Lre = new Float64Array(bins * frames)
    const Lim = new Float64Array(bins * frames)
    const Rre = new Float64Array(bins * frames)
    const Rim = new Float64Array(bins * frames)
    const zr = new Float64Array(nFft)
    const zi = new Float64Array(nFft)
    for (let f = 0; f < frames; f++) {
        const start = f * hop
        for (let i = 0; i < nFft; i++) {
            zr[i] = padL[start + i] * win[i]
            zi[i] = padR[start + i] * win[i]
        }
        const { re, im } = fft.transform(zr, zi, false)
        const o = f * bins
        for (let k = 0; k < bins; k++) {
            const nk = k === 0 ? 0 : nFft - k
            const zrk = re[k]
            const zik = im[k]
            const zrn = re[nk]
            const zin = im[nk]
            Lre[o + k] = (zrk + zrn) * 0.5
            Lim[o + k] = (zik - zin) * 0.5
            Rre[o + k] = (zik + zin) * 0.5
            Rim[o + k] = -(zrk - zrn) * 0.5
        }
    }
    return { Lre, Lim, Rre, Rim, frames, bins }
}

export type IstftStereoOptions = {
    nFft: number
    hop: number
    frames: number
    bins: number
    window?: Float64Array
    center?: boolean
    length?: number | null
}

// Inverse of stftStereo: pack Z = Lspec + i·Rspec, one IFFT per frame, then
// L = Re(z), R = Im(z). Inputs are one-sided; the upper half is reconstructed by
// Hermitian symmetry.
export function istftStereo(
    Lre: Float64Array,
    Lim: Float64Array,
    Rre: Float64Array,
    Rim: Float64Array,
    opts: IstftStereoOptions
): { left: Float64Array; right: Float64Array } {
    const { nFft, hop, frames, bins, center = true, length = null } = opts
    const win = opts.window || hannPeriodic(nFft)
    const fft = getFFT(nFft)
    const outLen = (frames - 1) * hop + nFft
    const accL = new Float64Array(outLen)
    const accR = new Float64Array(outLen)
    const wenv = new Float64Array(outLen)
    const Zr = new Float64Array(nFft)
    const Zi = new Float64Array(nFft)
    for (let f = 0; f < frames; f++) {
        const o = f * bins
        for (let k = 0; k < nFft; k++) {
            let lr: number
            let li: number
            let rr: number
            let ri: number
            if (k < bins) {
                lr = Lre[o + k]
                li = Lim[o + k]
                rr = Rre[o + k]
                ri = Rim[o + k]
            } else {
                const m = nFft - k
                lr = Lre[o + m]
                li = -Lim[o + m]
                rr = Rre[o + m]
                ri = -Rim[o + m]
            }
            Zr[k] = lr - ri
            Zi[k] = li + rr
        }
        const z = fft.transform(Zr, Zi, true)
        const start = f * hop
        for (let i = 0; i < nFft; i++) {
            const w = win[i]
            accL[start + i] += z.re[i] * w
            accR[start + i] += z.im[i] * w
            wenv[start + i] += w * w
        }
    }
    for (let i = 0; i < outLen; i++) {
        if (wenv[i] > 1e-10) {
            accL[i] /= wenv[i]
            accR[i] /= wenv[i]
        }
    }
    let resL = accL
    let resR = accR
    if (center) {
        const p = nFft >> 1
        resL = accL.subarray(p, outLen - p)
        resR = accR.subarray(p, outLen - p)
    }
    const finalize = (res: Float64Array): Float64Array => {
        if (length != null) {
            const t = new Float64Array(length)
            t.set(res.subarray(0, Math.min(length, res.length)))
            return t
        }
        return Float64Array.from(res)
    }
    return { left: finalize(resL), right: finalize(resR) }
}
