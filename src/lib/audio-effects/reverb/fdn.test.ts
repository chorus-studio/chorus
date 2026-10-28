import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getParamsListForEffect, roomPresets } from './presets'

// Runs the FDN worklet (src/public/fdn-processor.js) offline, the way the
// browser's audio thread would, and checks what the room presets promise:
// a decay time that follows `decay`, a stereo tail, and a dry path at unity.

const SR = 44100
const BLOCK = 128

type Processor = {
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        params: Record<string, Float32Array>
    ): boolean
}
type ProcessorClass = {
    new (options: object): Processor
    parameterDescriptors: { name: string; defaultValue: number }[]
}

function loadWorklet(): ProcessorClass {
    let registered: ProcessorClass | undefined
    const scope = {
        sampleRate: SR,
        AudioWorkletProcessor: class {},
        registerProcessor: (_name: string, cls: ProcessorClass) => (registered = cls)
    }
    const source = readFileSync(
        new URL('../../../public/fdn-processor.js', import.meta.url),
        'utf8'
    )
    new Function(...Object.keys(scope), source)(...Object.values(scope))
    if (!registered) throw new Error('fdn-processor.js registered nothing')
    return registered
}

const FDN = loadWorklet()
const rt60 = (decay: number) => 0.1 * 100 ** decay

// Stereo impulse response of the worklet for the given params.
function impulse(params: Record<string, number>, seconds: number, right = 1) {
    const node = new FDN({})
    const p: Record<string, Float32Array> = {}
    for (const d of FDN.parameterDescriptors)
        p[d.name] = Float32Array.of(params[d.name] ?? d.defaultValue)
    const blocks = Math.ceil((seconds * SR) / BLOCK)
    const outL = new Float32Array(blocks * BLOCK)
    const outR = new Float32Array(blocks * BLOCK)
    const zero = new Float32Array(BLOCK)
    for (let b = 0; b < blocks; b++) {
        let L = zero
        let R = zero
        if (b === 0) {
            L = new Float32Array(BLOCK)
            R = new Float32Array(BLOCK)
            L[0] = 1
            R[0] = right
        }
        const out = [[new Float32Array(BLOCK), new Float32Array(BLOCK)]]
        node.process([[L, R]], out, p)
        outL.set(out[0][0], b * BLOCK)
        outR.set(out[0][1], b * BLOCK)
    }
    return { outL, outR }
}

// Two one-pole highpasses then two lowpasses: a 12 dB/oct band.
function band(x: Float32Array, lo: number, hi: number) {
    const pass = (input: Float32Array, fc: number, high: boolean) => {
        const a = Math.exp((-2 * Math.PI * fc) / SR)
        let lp = 0
        const y = new Float32Array(input.length)
        for (let i = 0; i < input.length; i++) {
            lp = a * lp + (1 - a) * input[i]
            y[i] = high ? input[i] - lp : lp
        }
        return y
    }
    return pass(pass(pass(pass(x, lo, true), lo, true), hi, false), hi, false)
}

// T60 from the Schroeder energy decay curve (T20 fit × 3).
function t60(outL: Float32Array, outR: Float32Array) {
    const n = outL.length
    const edc = new Float64Array(n)
    let acc = 0
    for (let i = n - 1; i >= 0; i--) {
        acc += outL[i] * outL[i] + outR[i] * outR[i]
        edc[i] = acc
    }
    const at = (level: number) => {
        for (let i = 0; i < n; i++) if (10 * Math.log10(edc[i] / edc[0]) <= level) return i / SR
        return n / SR
    }
    return (at(-25) - at(-5)) * 3
}

const paramsOf = (effect: string) =>
    Object.fromEntries(
        getParamsListForEffect({ effect, preset: 'rooms' }).map(({ name, value }) => [name, value])
    )

describe('FDN reverb worklet', () => {
    it('maps decay to a 60 dB decay time of 0.1 s × 100^decay', () => {
        for (const decay of [0.3, 0.5, 0.7, 0.9]) {
            const { outL, outR } = impulse(
                { decay, damping: 0, excursionDepth: 0, early: 0, dry: 0 },
                12
            )
            const mid = t60(band(outL, 500, 1000), band(outR, 500, 1000))
            expect(mid, `decay ${decay}`).toBeGreaterThan(rt60(decay) * 0.85)
            expect(mid, `decay ${decay}`).toBeLessThan(rt60(decay) * 1.15)
        }
    })

    it('damping shortens the decay above 4 kHz and leaves the mids', () => {
        const open = impulse({ decay: 0.6, damping: 0, excursionDepth: 0, early: 0, dry: 0 }, 8)
        const dark = impulse({ decay: 0.6, damping: 0.8, excursionDepth: 0, early: 0, dry: 0 }, 8)
        const high = (r: typeof open) => t60(band(r.outL, 4000, 8000), band(r.outR, 4000, 8000))
        const mid = (r: typeof open) => t60(band(r.outL, 500, 1000), band(r.outR, 500, 1000))
        expect(high(dark)).toBeLessThan(high(open) * 0.65)
        expect(mid(dark)).toBeGreaterThan(mid(open) * 0.85)
    })

    it.each(roomPresets)(
        '%s decays in its intended time, in stereo, without blowing up',
        (effect) => {
            const params = paramsOf(effect)
            const seconds = Math.min(12, rt60(params.decay) * 1.5 + 1)
            const { outL, outR } = impulse({ ...params, dry: 0 }, seconds)
            expect(outL.every(Number.isFinite) && outR.every(Number.isFinite)).toBe(true)
            const mid = t60(band(outL, 500, 1000), band(outR, 500, 1000))
            expect(mid).toBeGreaterThan(rt60(params.decay) * 0.8)
            expect(mid).toBeLessThan(rt60(params.decay) * 1.25)
            // Left and right tails are different signals, not a mono copy.
            const from = Math.round(0.05 * SR)
            let ll = 0
            let rr = 0
            let lr = 0
            for (let i = from; i < outL.length; i++) {
                ll += outL[i] * outL[i]
                rr += outR[i] * outR[i]
                lr += outL[i] * outR[i]
            }
            expect(Math.abs(lr / Math.sqrt(ll * rr))).toBeLessThan(0.3)
            // Nothing hotter than the impulse itself in the tail.
            let peak = 0
            for (let i = 0; i < outL.length; i++)
                peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]))
            expect(peak).toBeLessThan(0.5)
        }
    )

    it('passes the dry signal per channel at unity, with the tail after the pre-delay', () => {
        const { outL, outR } = impulse({ ...paramsOf('hall'), wet: 0.5 }, 0.2, 0)
        expect(outL[0]).toBeCloseTo(1, 5)
        expect(outR[0]).toBeCloseTo(0, 5)
        // Hall pre-delay is 20 ms: nothing but the dry sample before it.
        const pd = Math.round(0.02 * SR)
        for (let i = 1; i < pd - 2; i++)
            expect(Math.abs(outL[i]) + Math.abs(outR[i])).toBeLessThan(1e-6)
        let tail = 0
        for (let i = pd; i < outL.length; i++) tail += Math.abs(outL[i]) + Math.abs(outR[i])
        expect(tail).toBeGreaterThan(0.1)
    })
})
