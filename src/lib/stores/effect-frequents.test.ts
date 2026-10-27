import { describe, expect, it, vi } from 'vitest'

// The store hydrates from extension storage on import; stand that in.
vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))

import { EFFECT_FREQUENTS_MAX, withFrequent, type EffectFrequent } from './effect-frequents'

const chip = (value: string, pinned = false): EffectFrequent => ({ value, pinned })

describe('withFrequent', () => {
    it('leaves a known value where it is', () => {
        const list = [chip('hall'), chip('studio')]
        expect(withFrequent(list, 'studio')).toBe(list)
    })

    it('appends while there is room', () => {
        expect(withFrequent([chip('hall')], 'cave').map((f) => f.value)).toEqual(['hall', 'cave'])
    })

    it('writes over the oldest unpinned chip once full, and never a pinned one', () => {
        const full = Array.from({ length: EFFECT_FREQUENTS_MAX }, (_, i) => chip(`p${i}`, i === 0))
        const next = withFrequent(full, 'cave')
        expect(next[0]).toEqual(chip('p0', true))
        expect(next[1]).toEqual(chip('cave'))
        expect(next).toHaveLength(EFFECT_FREQUENTS_MAX)
    })

    it('leaves a fully pinned list alone', () => {
        const pinned = Array.from({ length: EFFECT_FREQUENTS_MAX }, (_, i) => chip(`p${i}`, true))
        expect(withFrequent(pinned, 'cave')).toBe(pinned)
    })
})
