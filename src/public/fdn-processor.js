// Feedback-delay-network reverb for the Room presets, in the structure of Fons
// Adriaensen's zita-rev1: eight delay lines, each with an allpass diffuser in
// its loop, mixed back through a Householder matrix. Every line's gain is set
// from a decay time (RT60), so `decay` means the same seconds in a small room
// and a cathedral. A one-pole lowpass in each loop, pinned so that the decay
// time halves at a damping frequency (`damping` sweeps it from 20 kHz down to
// 1.5 kHz), takes the highs down faster, as zita-rev1's does. Stereo in and out: the left channel feeds the even lines,
// the right the odd, and the two outputs take different ± mixes of all eight.
// Early reflections come from a tapped delay per channel; their times and the
// line lengths scale together with `size`.
//
// Parameter names match the Dattorro plate (processor.js) where they mean the
// same thing, so one config editor and one saved-config shape serve both.
// @ts-nocheck

// Line lengths in seconds at size 1 (zita-rev1's), and the allpass diffuser
// inside each loop. Both scale with `size` down to a fifth.
const TDELAY = [0.153129, 0.210389, 0.127837, 0.256891, 0.174713, 0.192303, 0.125, 0.219991]
const TDIFF = [0.020346, 0.024421, 0.031604, 0.027333, 0.022904, 0.029291, 0.013458, 0.019123]
const DIFF_K = 0.6
// Input diffusers (Dattorro's pre-tank lengths, offset per channel).
const INDIFF = [
    [0.004771, 0.003595],
    [0.004311, 0.003931]
]
// Early reflections at size 1: [seconds, gain] per channel, alternating sign.
const EARLY = [
    [
        [0.012, 0.72],
        [0.019, -0.55],
        [0.029, 0.46],
        [0.038, -0.36],
        [0.048, 0.3],
        [0.063, -0.22]
    ],
    [
        [0.014, 0.7],
        [0.022, -0.52],
        [0.031, 0.44],
        [0.041, -0.35],
        [0.051, 0.28],
        [0.067, -0.21]
    ]
]
// Outputs: the left takes the even lines (the ones the left input feeds), the
// right the odd, as zita-rev1 does. The feedback matrix spreads each side into
// the other within a pass, so a source on one side starts there and fills the
// room; the two tails measure uncorrelated.
const OUT_L = [1, 0, 1, 0, 1, 0, 1, 0]
const OUT_R = [0, 1, 0, 1, 0, 1, 0, 1]
const IN_GAIN = 0.5
const LATE_GAIN = 1
const EARLY_GAIN = 0.6
const MIN_SIZE = 0.2
// Damping 0..1 sweeps the frequency where the decay time halves from 20 kHz
// (nothing audible) down to 1.5 kHz, on a log scale.
const DAMP_HZ_MAX = 20000
const DAMP_HZ_MIN = 1500
const TWO_PI = 2 * Math.PI

// RT60 in seconds for `decay` 0..1: 0.1 s at 0, 1 s at 0.5, 10 s at 1.
const rt60 = (decay) => 0.1 * Math.pow(100, decay)

class Line {
    constructor(maxSamples) {
        const n = 2 ** Math.ceil(Math.log2(maxSamples + 8))
        this.buf = new Float32Array(n)
        this.mask = n - 1
        this.w = 0
    }

    write(x) {
        this.buf[this.w] = x
        this.w = (this.w + 1) & this.mask
    }

    // The sample written `d` writes ago (d >= 1).
    read(d) {
        return this.buf[(this.w - d) & this.mask]
    }

    // Fractional delay with cubic interpolation (d >= 2).
    // O. Niemitalo: https://www.musicdsp.org/en/latest/Other/49-cubic-interpollation.html
    readFrac(d) {
        const di = ~~d
        const f = d - di
        const i1 = (this.w - di) & this.mask
        const b = this.buf
        const x0 = b[(i1 + 1) & this.mask]
        const x1 = b[i1]
        const x2 = b[(i1 - 1) & this.mask]
        const x3 = b[(i1 - 2) & this.mask]
        const a = (3 * (x1 - x2) - x0 + x3) / 2
        const c2 = 2 * x2 + x0 - (5 * x1 + x3) / 2
        const c = (x2 - x0) / 2
        return ((a * f + c2) * f + c) * f + x1
    }
}

class FDNReverb extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            ['preDelay', 0, 0, sampleRate - 1, 'k-rate'],
            ['bandwidth', 0.9999, 0, 1, 'k-rate'],
            ['inputDiffusion1', 0.75, 0, 1, 'k-rate'],
            ['inputDiffusion2', 0.625, 0, 1, 'k-rate'],
            ['decay', 0.5, 0, 1, 'k-rate'],
            ['damping', 0.3, 0, 1, 'k-rate'],
            ['size', 0.5, 0, 1, 'k-rate'],
            ['early', 0.5, 0, 1, 'k-rate'],
            ['excursionRate', 0.5, 0, 2, 'k-rate'],
            ['excursionDepth', 0.5, 0, 2, 'k-rate'],
            ['wet', 0.2, 0, 1, 'k-rate'],
            ['dry', 1, 0, 1, 'k-rate']
        ].map(
            (x) =>
                new Object({
                    name: x[0],
                    defaultValue: x[1],
                    minValue: x[2],
                    maxValue: x[3],
                    automationRate: x[4]
                })
        )
    }

    constructor(options) {
        super(options)
        // A worklet whose process() returns true is an active source: the node
        // keeps running after it is disconnected and dropped. The owner posts
        // 'dispose' when it lets a node go, and process() returns false from
        // then on, so the node can stop and be collected.
        this._disposed = false
        this.port.onmessage = (e) => {
            if (e.data === 'dispose') this._disposed = true
        }
        const fs = sampleRate
        this._pre = [new Line(fs + 0.08 * fs), new Line(fs + 0.08 * fs)]
        this._inLp = [0, 0]
        this._inApLen = INDIFF.map((pair) => pair.map((t) => Math.round(t * fs)))
        this._inAp = this._inApLen.map((pair) => pair.map((n) => new Line(n)))
        this._lines = TDELAY.map((t) => new Line(Math.ceil(t * fs) + 0.004 * fs))
        this._diff = TDIFF.map((t) => new Line(Math.ceil(t * fs)))
        this._lp = new Float64Array(8)
        this._out = new Float64Array(8)
        this._phase = Float64Array.from(TDELAY, (_, i) => (i / 8) * TWO_PI)
        this._len = new Float64Array(8)
        this._dlen = new Int32Array(8)
        this._gain = new Float64Array(8)
        this._damp = new Float64Array(8)
        this._erTap = [new Int32Array(6), new Int32Array(6)]
    }

    // Per-block: line lengths from size, gains and damping from decay, early tap
    // positions from size and pre-delay.
    _setup(size, decay, damping, depth, pd) {
        const fs = sampleRate
        const s = MIN_SIZE + (1 - MIN_SIZE) * size
        const t60 = rt60(decay)
        const fd = DAMP_HZ_MAX * Math.pow(DAMP_HZ_MIN / DAMP_HZ_MAX, damping)
        const chi = 1 - Math.cos((TWO_PI * fd) / fs)
        for (let i = 0; i < 8; i++) {
            const dlen = Math.max(4, Math.round(TDIFF[i] * s * fs))
            const len = Math.max(4, TDELAY[i] * s * fs - dlen)
            this._dlen[i] = dlen
            this._len[i] = len
            const loop = len + dlen + depth
            const g = Math.pow(10, (-3 * loop) / (t60 * fs))
            this._gain[i] = g
            // One-pole lowpass coefficient w (lp += w·(x − lp)) whose gain at
            // fd is the extra per-pass loss that halves the decay time there,
            // which works out to g again: |H(fd)|² = w² / (w² + 2(1 − w)·chi).
            const a = 1 - g * g
            const b = 2 * g * g * chi
            this._damp[i] = a < 1e-9 ? 1 : (-b + Math.sqrt(b * b + 4 * a * b)) / (2 * a)
        }
        for (let ch = 0; ch < 2; ch++) {
            for (let t = 0; t < 6; t++) {
                this._erTap[ch][t] = pd + 1 + Math.round(EARLY[ch][t][0] * s * fs)
            }
        }
    }

    process(inputs, outputs, parameters) {
        if (this._disposed) return false

        const p = parameters
        const pd = ~~p.preDelay[0]
        const bw = p.bandwidth[0]
        const k1 = p.inputDiffusion1[0]
        const k2 = p.inputDiffusion2[0]
        const depth = (p.excursionDepth[0] * sampleRate) / 1000
        const rate = (p.excursionRate[0] * TWO_PI) / sampleRate
        const wet = p.wet[0]
        const dry = p.dry[0]
        const early = p.early[0] * EARLY_GAIN
        this._setup(p.size[0], p.decay[0], p.damping[0], depth, pd)

        const input = inputs[0]
        const inL = input.length > 0 ? input[0] : null
        const inR = input.length > 1 ? input[1] : inL
        const outL = outputs[0][0]
        const outR = outputs[0][1]
        const pre = this._pre
        const lines = this._lines
        const diff = this._diff
        const lp = this._lp
        const o = this._out
        const inAp = this._inAp
        const inApLen = this._inApLen
        const phase = this._phase
        const inLp = this._inLp
        const len = this._len
        const dlen = this._dlen
        const gain = this._gain
        const damp = this._damp
        const erL = this._erTap[0]
        const erR = this._erTap[1]

        for (let n = 0; n < 128; n++) {
            const xl = inL ? inL[n] : 0
            const xr = inR ? inR[n] : 0
            pre[0].write(xl)
            pre[1].write(xr)

            // Pre-delayed input and the early reflections off it (a quarter
            // of each tap comes from the other channel).
            const dl = pre[0].read(pd + 1)
            const dr = pre[1].read(pd + 1)
            let el = 0
            let er = 0
            for (let t = 0; t < 6; t++) {
                const al = pre[0].read(erL[t])
                const bl = pre[1].read(erL[t])
                el += EARLY[0][t][1] * (0.75 * al + 0.25 * bl)
                const ar = pre[1].read(erR[t])
                const br = pre[0].read(erR[t])
                er += EARLY[1][t][1] * (0.75 * ar + 0.25 * br)
            }

            // Input bandwidth and two allpass diffusers per channel.
            inLp[0] += bw * (dl - inLp[0])
            inLp[1] += bw * (dr - inLp[1])
            let fl = inLp[0]
            let fr = inLp[1]
            for (let ch = 0; ch < 2; ch++) {
                const ap = inAp[ch]
                const apLen = inApLen[ch]
                let x = ch === 0 ? fl : fr
                for (let j = 0; j < 2; j++) {
                    const k = j === 0 ? k1 : k2
                    const r = ap[j].read(apLen[j])
                    const v = x - k * r
                    ap[j].write(v)
                    x = r + k * v
                }
                if (ch === 0) fl = x
                else fr = x
            }

            // Lines: read (modulated), diffuse, damp, scale.
            let sum = 0
            for (let i = 0; i < 8; i++) {
                const ph = phase[i]
                const d = len[i] + depth * (1 + Math.sin(ph))
                const next = ph + rate * (1 + 0.07 * i)
                phase[i] = next > TWO_PI ? next - TWO_PI : next
                const raw = lines[i].readFrac(d)
                const r = diff[i].read(dlen[i])
                const v = raw - DIFF_K * r
                diff[i].write(v)
                const y = r + DIFF_K * v
                lp[i] += damp[i] * (y - lp[i])
                o[i] = gain[i] * lp[i]
                sum += o[i]
            }
            // Householder feedback: I - (2/8)·11ᵀ, plus the input.
            const h = 0.25 * sum
            for (let i = 0; i < 8; i++) {
                lines[i].write(o[i] - h + IN_GAIN * (i & 1 ? fr : fl))
            }
            let ll = 0
            let lr = 0
            for (let i = 0; i < 8; i++) {
                ll += OUT_L[i] * o[i]
                lr += OUT_R[i] * o[i]
            }
            outL[n] = dry * xl + wet * (early * el + LATE_GAIN * ll)
            outR[n] = dry * xr + wet * (early * er + LATE_GAIN * lr)
        }
        return true
    }
}

registerProcessor('FDNReverb', FDNReverb)
