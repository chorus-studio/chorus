import { describe, expect, it } from 'vitest'
import {
    customPresets,
    engineFor,
    getParamsListForEffect,
    impulsePresets,
    PRESET_ALIASES,
    resolveReverbPreset,
    roomPresets,
    STRUCTURAL_PARAMS
} from './presets'

const paramsOf = (entry: { effect: string; preset: 'rooms' | 'custom' }) =>
    Object.fromEntries(getParamsListForEffect(entry).map(({ name, value }) => [name, value]))

// Every preset leaves the track at its level and adds the tail on top: the
// worklet is the whole reverb path, with nothing bypassing it.
describe('reverb presets', () => {
    const all = [
        ...roomPresets.map((effect) => ({ effect, preset: 'rooms' as const })),
        ...customPresets.map((effect) => ({ effect, preset: 'custom' as const }))
    ]

    it.each(all)('$effect has dry at unity and a wet send within range', (entry) => {
        const params = paramsOf(entry)
        expect(params.dry).toBe(1)
        expect(params.wet).toBeGreaterThan(0)
        expect(params.wet).toBeLessThanOrEqual(1)
    })

    it('rooms run on the FDN, customs on the plate, impulses on neither', () => {
        for (const effect of roomPresets) expect(engineFor(effect)).toBe('fdn')
        for (const effect of customPresets) expect(engineFor(effect)).toBe('plate')
        expect(engineFor('none')).toBe('plate')
        expect(engineFor('classroom')).toBe('fdn') // alias of studio
    })

    // The FDN's parameter set, every value inside the worklet's range, with the
    // room shape (size, early) among them so a preset switch can set it at once.
    it.each(roomPresets)('%s carries the FDN parameters within range', (effect) => {
        const params = paramsOf({ effect, preset: 'rooms' })
        for (const key of ['bandwidth', 'decay', 'damping', 'size', 'early', 'wet']) {
            expect(params[key], key).toBeGreaterThanOrEqual(0)
            expect(params[key], key).toBeLessThanOrEqual(1)
        }
        expect(params.preDelay).toBeGreaterThanOrEqual(0)
        expect(params.preDelay).toBeLessThan(44100 * 0.1)
        for (const key of STRUCTURAL_PARAMS) expect(params).toHaveProperty(key)
    })

    it('rooms step up in size and decay from small to cathedral', () => {
        const small = paramsOf({ effect: 'small', preset: 'rooms' })
        const hall = paramsOf({ effect: 'hall', preset: 'rooms' })
        const cathedral = paramsOf({ effect: 'cathedral', preset: 'rooms' })
        expect(small.size).toBeLessThan(hall.size)
        expect(hall.size).toBeLessThan(cathedral.size)
        expect(small.decay).toBeLessThan(hall.decay)
        expect(hall.decay).toBeLessThan(cathedral.decay)
        expect(small.preDelay).toBeLessThan(cathedral.preDelay)
    })
})

describe('reverb aliases', () => {
    const kept = [...roomPresets, ...customPresets, ...impulsePresets]

    it('every removed name resolves to a kept preset in one step', () => {
        for (const [from, to] of Object.entries(PRESET_ALIASES)) {
            expect(kept).not.toContain(from)
            expect(kept, `${from} → ${to}`).toContain(to)
        }
        expect(resolveReverbPreset('classroom')).toBe('studio')
        expect(resolveReverbPreset('kick')).toBe('kick_ir')
    })
})
