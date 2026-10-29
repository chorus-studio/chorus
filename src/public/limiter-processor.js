// The output limiter: a lookahead brick-wall limiter, last in the chain
// before the destination. Chorus's volume boosts to 300% (or +20 dB on the
// logarithmic curve) and the effects add level on top; the destination
// hard-clips anything past full scale, and that clipping is 11% distortion
// at 1.5× and 28% at 3× (measured). This never lets a sample past the
// ceiling: each input sample's required gain (ceiling / peak) goes into a
// sliding-window minimum over the 5 ms lookahead, the applied gain moves to
// that minimum over about a quarter of the window (so it is in place when
// the peak reaches the output) and releases slowly, and the delayed sample
// is scaled by it. A hard clamp at ±1 is the last resort for the fraction of
// a percent the smoothing leaves. Below the ceiling it is a 5 ms delay and
// nothing else. The window minimum is a monotonic deque, O(1) per sample.
// @ts-nocheck

const LOOKAHEAD_S = 0.005

class ChorusLimiter extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            {
                name: 'ceiling',
                defaultValue: 0.944,
                minValue: 0.05,
                maxValue: 1,
                automationRate: 'k-rate'
            },
            {
                name: 'release',
                defaultValue: 0.08,
                minValue: 0.005,
                maxValue: 2,
                automationRate: 'k-rate'
            }
        ]
    }

    constructor(options) {
        super(options)
        // Answer 'dispose' by returning false from process() from then on: a
        // processor that keeps returning true keeps rendering after the node
        // is dropped (see src/lib/audio-effects/worklet.ts).
        this._disposed = false
        this.port.onmessage = (e) => {
            if (e.data === 'dispose') this._disposed = true
        }
        this._la = Math.round(LOOKAHEAD_S * sampleRate)
        const n = 2 ** Math.ceil(Math.log2(this._la + 256))
        this._mask = n - 1
        this._bufL = new Float32Array(n)
        this._bufR = new Float32Array(n)
        this._need = new Float32Array(n).fill(1)
        // Monotonic deque of absolute sample counts whose `need` increases
        // from head to tail; the head is the window minimum.
        this._dq = new Float64Array(n)
        this._head = 0
        this._tail = 0
        this._count = 0
        this._gain = 1
        this._attack = 1 - Math.exp(-1 / (this._la / 4))
    }

    process(inputs, outputs, parameters) {
        if (this._disposed) return false

        const input = inputs[0]
        const inL = input.length > 0 ? input[0] : null
        const inR = input.length > 1 ? input[1] : inL
        const outL = outputs[0][0]
        const outR = outputs[0][1]
        const ceiling = parameters.ceiling[0]
        const rel = 1 - Math.exp(-1 / (parameters.release[0] * sampleRate))
        const att = this._attack
        const la = this._la
        const mask = this._mask
        const bufL = this._bufL
        const bufR = this._bufR
        const need = this._need
        const dq = this._dq
        let head = this._head
        let tail = this._tail
        let count = this._count
        let gain = this._gain

        for (let i = 0; i < 128; i++) {
            const l = inL ? inL[i] : 0
            const r = inR ? inR[i] : 0
            const w = count & mask
            bufL[w] = l
            bufR[w] = r
            const peak = Math.max(Math.abs(l), Math.abs(r))
            const g = peak > ceiling ? ceiling / peak : 1
            need[w] = g
            // Drop entries that this sample undercuts, then append it.
            while (tail !== head && need[dq[(tail - 1) & mask] & mask] >= g)
                tail = (tail - 1) & mask
            dq[tail] = count
            tail = (tail + 1) & mask
            // Drop entries that have left the window.
            while (dq[head] < count - la) head = (head + 1) & mask
            const m = need[dq[head] & mask]
            gain += (m - gain) * (m < gain ? att : rel)

            const d = (count - la) & mask
            const ol = bufL[d] * gain
            const or = bufR[d] * gain
            outL[i] = ol > 1 ? 1 : ol < -1 ? -1 : ol
            outR[i] = or > 1 ? 1 : or < -1 ? -1 : or
            count++
        }

        this._head = head
        this._tail = tail
        this._count = count
        this._gain = gain
        return true
    }
}

registerProcessor('ChorusLimiter', ChorusLimiter)
