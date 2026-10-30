import { describe, expect, it } from 'vitest'
import { MIX_MAX, blendStems, clampMix, presetOf, sameMix, scaleStem } from './mix'

describe('clampMix / presetOf', () => {
    it('keeps factors between 0 and 2, two decimals, defaulting to the instrumental', () => {
        expect(clampMix({ vocals: 0.256, instruments: 9 })).toEqual({
            vocals: 0.26,
            instruments: MIX_MAX
        })
        expect(clampMix({ vocals: -1, instruments: 'x' as unknown as number })).toEqual({
            vocals: 0,
            instruments: 1
        })
        expect(clampMix(null)).toEqual({ vocals: 0, instruments: 1 })
    })

    it('names the preset a mix matches', () => {
        expect(presetOf({ vocals: 0, instruments: 1 })?.id).toBe('instrumental')
        expect(presetOf({ vocals: 1, instruments: 1 })).toBeNull()
        expect(presetOf({ vocals: 0.254, instruments: 1 })?.id).toBe('karaoke')
        expect(presetOf({ vocals: 0.4, instruments: 1 })).toBeNull()
        expect(sameMix({ vocals: 1, instruments: 1 }, { vocals: 1.004, instruments: 0.996 })).toBe(
            true
        )
    })
})

describe('blendStems / scaleStem', () => {
    const x = new Float32Array([1, 0.5, -0.5])
    const inst = new Float32Array([0.6, 0.5, -0.1])

    it('gives the original back at (1, 1) and the stems at the extremes', () => {
        expect(Array.from(blendStems(x, inst, { vocals: 1, instruments: 1 }))).toEqual(
            Array.from(x)
        )
        expect(Array.from(blendStems(x, inst, { vocals: 0, instruments: 1 }))).toEqual(
            Array.from(inst)
        )
        expect(
            Array.from(blendStems(x, inst, { vocals: 1, instruments: 0 })).map((v) =>
                Number(v.toFixed(6))
            )
        ).toEqual([0.4, 0, -0.4])
    })

    it('mixes in between and scales', () => {
        const out = blendStems(x, inst, { vocals: 0.5, instruments: 1 })
        expect(Array.from(out).map((v) => Number(v.toFixed(6)))).toEqual([0.8, 0.5, -0.3])
        expect(scaleStem(inst, 1)).toBe(inst)
        expect(Array.from(scaleStem(inst, 2)).map((v) => Number(v.toFixed(6)))).toEqual([
            1.2, 1, -0.2
        ])
    })
})
