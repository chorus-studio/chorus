import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LIMITER, limiterLatencySamples } from './limiter'

// Runs the limiter worklet (src/public/limiter-processor.js) offline, the way
// the audio thread would, and checks what the chain relies on: nothing past
// the ceiling at any gain, a pure delay below it, and a stop on dispose.

const SR = 44100
const BLOCK = 128
const LA = limiterLatencySamples(SR)

type Port = { onmessage: ((e: { data: unknown }) => void) | null; postMessage: () => void }
type Processor = {
    port: Port
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
        AudioWorkletProcessor: class {
            port: Port = { onmessage: null, postMessage: () => {} }
        },
        registerProcessor: (_name: string, cls: ProcessorClass) => (registered = cls)
    }
    const source = readFileSync(
        new URL('../../public/limiter-processor.js', import.meta.url),
        'utf8'
    )
    new Function(...Object.keys(scope), source)(...Object.values(scope))
    if (!registered) throw new Error('limiter-processor.js registered nothing')
    return registered
}

const Limiter = loadWorklet()

function run(gen: (i: number) => [number, number], seconds: number, node = new Limiter({})) {
    const params = {
        ceiling: Float32Array.of(LIMITER.ceiling),
        release: Float32Array.of(LIMITER.release)
    }
    const blocks = Math.ceil((seconds * SR) / BLOCK)
    const outL = new Float32Array(blocks * BLOCK)
    const outR = new Float32Array(blocks * BLOCK)
    const inL = new Float32Array(blocks * BLOCK)
    const inR = new Float32Array(blocks * BLOCK)
    for (let b = 0; b < blocks; b++) {
        const L = new Float32Array(BLOCK)
        const R = new Float32Array(BLOCK)
        for (let i = 0; i < BLOCK; i++) {
            const [l, r] = gen(b * BLOCK + i)
            L[i] = l
            R[i] = r
        }
        inL.set(L, b * BLOCK)
        inR.set(R, b * BLOCK)
        const out = [[new Float32Array(BLOCK), new Float32Array(BLOCK)]]
        node.process([[L, R]], out, params)
        outL.set(out[0][0], b * BLOCK)
        outR.set(out[0][1], b * BLOCK)
    }
    return { inL, inR, outL, outR }
}

const peakOf = (a: Float32Array, from = 0) => {
    let p = 0
    for (let i = from; i < a.length; i++) p = Math.max(p, Math.abs(a[i]))
    return p
}
// Chord plus a kick every 250 ms, peaking near full scale, times a gain.
const music =
    (gain: number) =>
    (i: number): [number, number] => {
        const t = i / SR
        const beat = t % 0.25
        const kick =
            Math.exp(-beat * 28) * Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-beat * 40)) * t)
        const chord =
            0.25 *
            (Math.sin(2 * Math.PI * 220 * t) +
                Math.sin(2 * Math.PI * 277 * t) +
                Math.sin(2 * Math.PI * 330 * t))
        const v = (0.55 * kick + chord) * 0.89 * gain
        return [v, v * 0.9]
    }

describe('output limiter worklet', () => {
    it('is a pure 5 ms delay below the ceiling', () => {
        const { inL, inR, outL, outR } = run(
            (i) => [0.5 * Math.sin(i / 7), 0.4 * Math.cos(i / 11)],
            0.5
        )
        for (let i = LA; i < outL.length; i++) {
            expect(outL[i]).toBe(inL[i - LA])
            expect(outR[i]).toBe(inR[i - LA])
        }
    })

    it.each([1.5, 3, 10])(
        'holds a %sx boost under the ceiling with nothing past full scale',
        (gain) => {
            const { outL, outR } = run(music(gain), 2)
            const settle = SR * 0.1
            expect(peakOf(outL, settle)).toBeLessThanOrEqual(1)
            expect(peakOf(outR, settle)).toBeLessThanOrEqual(1)
            // Within a few percent of the ceiling: the smoothing's residual, clamped.
            expect(peakOf(outL, settle)).toBeLessThan(LIMITER.ceiling * 1.03)
        }
    )

    it('keeps the level at a boost rather than squashing it to nothing', () => {
        const { outL } = run(music(3), 2)
        let s = 0
        for (let i = SR; i < outL.length; i++) s += outL[i] * outL[i]
        const rms = Math.sqrt(s / (outL.length - SR))
        expect(20 * Math.log10(rms)).toBeGreaterThan(-14)
    })

    it('stops for good once told to dispose', () => {
        const node = new Limiter({})
        node.port.onmessage!({ data: 'dispose' })
        const params = {
            ceiling: Float32Array.of(LIMITER.ceiling),
            release: Float32Array.of(LIMITER.release)
        }
        const io = () => [[new Float32Array(BLOCK), new Float32Array(BLOCK)]]
        expect(node.process(io(), io(), params)).toBe(false)
    })
})
