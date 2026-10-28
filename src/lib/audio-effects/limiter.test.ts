import { describe, expect, it } from 'vitest'
import { LIMITER, LIMITER_TRIM, limiterMakeupGain } from './limiter'

describe('output limiter', () => {
    it('sits at −1 dBFS with a hard knee and the hardest ratio the node offers', () => {
        expect(LIMITER.threshold).toBe(-1)
        expect(LIMITER.knee).toBe(0)
        expect(LIMITER.ratio).toBe(20)
    })

    // Measured in Chrome on 2026-10-28: a −20 dBFS sine came out +0.5699 dB
    // louder through the bare node. The trim cancels exactly that.
    it('trims the node’s automatic makeup gain, +0.57 dB at these settings', () => {
        expect(20 * Math.log10(limiterMakeupGain())).toBeCloseTo(0.5699, 3)
        expect(20 * Math.log10(LIMITER_TRIM)).toBeCloseTo(-0.5699, 3)
    })

    it('has no makeup to trim when the threshold is at full scale', () => {
        expect(limiterMakeupGain({ threshold: 0, ratio: 20 })).toBe(1)
    })
})
