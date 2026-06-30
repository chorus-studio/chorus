// Real-time streaming worklet for the vocal remover (runs in the OFFSCREEN doc's
// AudioContext). It does NO model work — it buffers the captured audio into
// overlapping CHUNK windows, ships each to the offscreen main thread (which runs
// rt_core_v1), and plays back the processed result from a bounded jitter buffer.
//
// Framing must match mdx.ts exactly (verified):
//   CHUNK = hop*(dimT-1) = 640*31 = 19840   (one model window = 32 STFT frames)
//   TRIM  = nFft/2       = 2560             (unreliable edge, discarded)
//   GEN   = CHUNK-2*TRIM = 14720            (the reliable middle we keep)
//
// Playback rules (from the adversarial review):
//   - Warmup: pass LIVE audio through until processed blocks are ready, then a
//     one-time crossfade into the processed stream (no silent gap at start). This
//     also serves as the failsafe — if the model never produces, you keep hearing
//     live audio rather than silence.
//   - Steady state: ONLY processed audio. On underrun → silence (never leak the
//     raw live mix, which would be an audible vocal burst).
//   - Bounded jitter buffer: drop oldest when too deep so latency can't creep.

const CHUNK = 19840
const TRIM = 2560
const GEN = CHUNK - 2 * TRIM // 14720
const WARMUP_BLOCKS = 2 // jitter-buffer target before playback starts
const MAX_BLOCKS = WARMUP_BLOCKS + 3 // cap → bounds latency
const FADE = 1024 // one-time live→processed crossfade length (samples)

class VocalStreamProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.inL = new Float32Array(CHUNK)
        this.inR = new Float32Array(CHUNK)
        this.inFill = TRIM // leading TRIM stays zero (zero-init)
        this.queue = []
        this.readOffset = 0
        this.started = false
        this.fade = 0
        // instrumentation
        this.underruns = 0
        this.wasUnderrun = false
        this.statSamples = 0

        this.port.onmessage = (e) => {
            const d = e.data
            if (d.type === 'processed') {
                const l = new Float32Array(d.left)
                const r = new Float32Array(d.right)
                this.queue.push({ l: l.subarray(TRIM, TRIM + GEN), r: r.subarray(TRIM, TRIM + GEN) })
                while (this.queue.length > MAX_BLOCKS) {
                    this.queue.shift()
                    this.readOffset = 0
                    this.fade = FADE
                }
                if (!this.started && this.queue.length >= WARMUP_BLOCKS) {
                    this.started = true
                    this.fade = FADE // crossfade live → processed
                }
            } else if (d.type === 'reset') {
                this.queue = []
                this.readOffset = 0
                this.started = false
                this.fade = 0
                this.inFill = TRIM
                this.inL.fill(0)
                this.inR.fill(0)
            }
        }
    }

    process(inputs, outputs) {
        const input = inputs[0]
        const output = outputs[0]
        if (!output || output.length === 0) return true

        const inL = input && input[0] ? input[0] : null
        const inR = input && input[1] ? input[1] : inL
        const outL = output[0]
        const outR = output[1] || null
        const n = outL.length

        for (let i = 0; i < n; i++) {
            const xl = inL ? inL[i] : 0
            const xr = inR ? inR[i] : 0

            // ---- accumulate into the current window ----
            this.inL[this.inFill] = xl
            this.inR[this.inFill] = xr
            this.inFill++
            if (this.inFill === CHUNK) {
                const sl = this.inL.slice()
                const sr = this.inR.slice()
                this.port.postMessage({ type: 'block', left: sl.buffer, right: sr.buffer }, [
                    sl.buffer,
                    sr.buffer
                ])
                this.inL.copyWithin(0, GEN)
                this.inR.copyWithin(0, GEN)
                this.inFill = CHUNK - GEN // = 2*TRIM
            }

            // ---- produce output ----
            let yl
            let yr
            if (!this.started) {
                // Warmup / failsafe: pass live through.
                yl = xl
                yr = xr
            } else {
                let pl = 0
                let pr = 0
                if (this.queue.length > 0) {
                    const blk = this.queue[0]
                    pl = blk.l[this.readOffset]
                    pr = blk.r[this.readOffset]
                    this.readOffset++
                    if (this.readOffset >= GEN) {
                        this.queue.shift()
                        this.readOffset = 0
                    }
                    this.wasUnderrun = false
                } else if (!this.wasUnderrun) {
                    this.underruns++
                    this.wasUnderrun = true
                }
                // Underrun → pl/pr stay 0 (silence), never live.
                if (this.fade > 0) {
                    // one-time crossfade from live to processed
                    const t = 1 - this.fade / FADE
                    yl = xl * (1 - t) + pl * t
                    yr = xr * (1 - t) + pr * t
                    this.fade--
                } else {
                    yl = pl
                    yr = pr
                }
            }

            outL[i] = yl
            if (outR) outR[i] = yr
        }

        this.statSamples += n
        if (this.statSamples >= sampleRate) {
            this.port.postMessage({ type: 'stats', queue: this.queue.length, underruns: this.underruns })
            this.statSamples = 0
        }

        return true
    }
}

registerProcessor('vocal-stream', VocalStreamProcessor)
