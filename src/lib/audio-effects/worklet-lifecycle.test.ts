import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Every Chorus worklet processor must stop when its owner lets the node go.
// A processor whose process() keeps returning true is an active source: the
// node renders every quantum after it is disconnected and dropped, and a
// preset switch drops one each time. Owners post 'dispose' (disposeWorklet);
// from then on process() returns false and the node can be collected.

const SR = 44100
const BLOCK = 128

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

function load(file: string): ProcessorClass {
    let registered: ProcessorClass | undefined
    const scope = {
        sampleRate: SR,
        AudioWorkletProcessor: class {
            port: Port = { onmessage: null, postMessage: () => {} }
        },
        registerProcessor: (_name: string, cls: ProcessorClass) => (registered = cls)
    }
    const source = readFileSync(new URL(`../../public/${file}`, import.meta.url), 'utf8')
    new Function(...Object.keys(scope), source)(...Object.values(scope))
    if (!registered) throw new Error(`${file} registered nothing`)
    return registered
}

const WORKLETS = ['processor.js', 'fdn-processor.js', 'ms-processor.js', 'limiter-processor.js']

describe.each(WORKLETS)('%s lifecycle', (file) => {
    const Proc = load(file)
    const run = (node: Processor) => {
        const params: Record<string, Float32Array> = {}
        for (const d of Proc.parameterDescriptors) params[d.name] = Float32Array.of(d.defaultValue)
        const io = () => [[new Float32Array(BLOCK), new Float32Array(BLOCK)]]
        return node.process(io(), io(), params)
    }

    it('keeps running while its owner holds it', () => {
        const node = new Proc({})
        expect(run(node)).toBe(true)
        expect(run(node)).toBe(true)
    })

    it('stops for good once told to dispose', () => {
        const node = new Proc({})
        expect(node.port.onmessage).toBeTypeOf('function')
        node.port.onmessage!({ data: 'dispose' })
        expect(run(node)).toBe(false)
        expect(run(node)).toBe(false)
    })

    it('ignores other messages', () => {
        const node = new Proc({})
        node.port.onmessage!({ data: 'count' })
        expect(run(node)).toBe(true)
    })
})
