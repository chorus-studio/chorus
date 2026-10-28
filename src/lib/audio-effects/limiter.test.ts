import { describe, expect, it } from 'vitest'
import { LIMITER, LIMITER_TRIM, limiterMakeupGain } from './limiter'

describe('output limiter', () => {
    it('sits at full scale with a hard knee, the hardest ratio the node offers and a short release', () => {
        expect(LIMITER.threshold).toBe(0)
        expect(LIMITER.knee).toBe(0)
        expect(LIMITER.ratio).toBe(20)
        expect(LIMITER.release).toBeLessThanOrEqual(0.1)
    })

    it('has no makeup to trim with the ceiling at full scale', () => {
        expect(limiterMakeupGain()).toBe(1)
        expect(LIMITER_TRIM).toBe(1)
    })

    // Measured in Chrome on 2026-10-28 with a −1 dBFS ceiling: a −20 dBFS sine
    // came out +0.5699 dB louder through the bare node. The formula is Blink's,
    // so the trim would cancel exactly that if the ceiling moved back down.
    it('follows Blink’s makeup formula when the ceiling sits below full scale', () => {
        expect(20 * Math.log10(limiterMakeupGain({ threshold: -1, ratio: 20 }))).toBeCloseTo(
            0.5699,
            3
        )
    })
})
