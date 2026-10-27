import { describe, expect, it } from 'vitest'
import { customPresets, getParamsListForEffect, roomPresets } from './presets'

// Every preset leaves the track at its level and adds the tail on top: the
// worklet is the whole reverb path, with nothing bypassing it.
describe('reverb presets', () => {
    const all = [
        ...roomPresets.map((effect) => ({ effect, preset: 'rooms' as const })),
        ...customPresets.map((effect) => ({ effect, preset: 'custom' as const }))
    ]

    it.each(all)('$effect has dry at unity and a wet send within range', (entry) => {
        const params = Object.fromEntries(
            getParamsListForEffect(entry).map(({ name, value }) => [name, value])
        )
        expect(params.dry).toBe(1)
        expect(params.wet).toBeGreaterThan(0)
        expect(params.wet).toBeLessThanOrEqual(1)
    })
})
