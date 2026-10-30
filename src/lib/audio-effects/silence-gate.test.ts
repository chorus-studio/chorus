import { describe, expect, it } from 'vitest'
import { SilenceGate, rmsOf, secondsSaved } from './silence-gate'

const gate = () => new SilenceGate({ threshold: 0.01, openAfterMs: 400, closeAfterMs: 0 })

describe('SilenceGate', () => {
    it('opens only after the silence has lasted long enough', () => {
        const g = gate()
        expect(g.feed(0.001, 0)).toBeNull()
        expect(g.feed(0.001, 200)).toBeNull()
        expect(g.feed(0.001, 399)).toBeNull()
        expect(g.feed(0.001, 400)).toBe('open')
        expect(g.open).toBe(true)
        expect(g.feed(0.001, 800)).toBeNull()
    })

    it('a short gap between words never opens it', () => {
        const g = gate()
        g.feed(0.001, 0)
        g.feed(0.001, 300)
        expect(g.feed(0.2, 350)).toBeNull()
        expect(g.feed(0.001, 400)).toBeNull()
        expect(g.feed(0.001, 700)).toBeNull()
        expect(g.feed(0.001, 800)).toBe('open')
    })

    it('closes the moment sound is back, and can wait for sustained sound', () => {
        const g = gate()
        g.feed(0.001, 0)
        g.feed(0.001, 500)
        expect(g.feed(0.05, 600)).toBe('close')
        expect(g.open).toBe(false)

        const patient = new SilenceGate({ threshold: 0.01, openAfterMs: 400, closeAfterMs: 100 })
        patient.feed(0.001, 0)
        patient.feed(0.001, 500)
        expect(patient.feed(0.05, 600)).toBeNull()
        expect(patient.feed(0.05, 650)).toBeNull()
        expect(patient.feed(0.05, 700)).toBe('close')
    })

    it('reset forgets the count without reporting a close', () => {
        const g = gate()
        g.feed(0.001, 0)
        g.feed(0.001, 500)
        g.reset()
        expect(g.open).toBe(false)
        expect(g.feed(0.001, 600)).toBeNull()
        expect(g.feed(0.001, 1000)).toBe('open')
    })
})

describe('rmsOf / secondsSaved', () => {
    it('measures loudness and the time a fast pass saves', () => {
        expect(rmsOf(new Float32Array([0, 0, 0]))).toBe(0)
        expect(rmsOf(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5)
        expect(rmsOf(new Float32Array())).toBe(0)
        expect(secondsSaved(2, 1, 2.5)).toBeCloseTo(3)
        expect(secondsSaved(2, 1.5, 3.75)).toBeCloseTo(3)
        expect(secondsSaved(2, 1, 1)).toBe(0)
        expect(secondsSaved(0, 1, 2.5)).toBe(0)
    })
})
