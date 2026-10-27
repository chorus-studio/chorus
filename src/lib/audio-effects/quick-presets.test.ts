import { describe, expect, it, vi } from 'vitest'

// The data module reaches the playback/effects stores, which hydrate from
// extension storage on import; stand that in with an empty store.
vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))

import { activePreset, quickPresetById } from './quick-presets'

describe('activePreset', () => {
    const nightcore = quickPresetById('nightcore')!
    const daycore = quickPresetById('daycore')!
    // A Mine slot kept from a built-in: same sound, its own id and name.
    const copy = { ...nightcore, id: 'slot-1', name: 'Fast' }

    it('names whichever matching preset was applied last', () => {
        expect(activePreset(nightcore, [nightcore, copy], 'slot-1')).toBe(copy)
        expect(activePreset(nightcore, [nightcore, copy], 'nightcore')).toBe(nightcore)
    })

    it('falls back to the first match when nothing was applied or it drifted', () => {
        expect(activePreset(nightcore, [nightcore, copy], null)).toBe(nightcore)
        expect(activePreset(daycore, [nightcore, copy, daycore], 'slot-1')).toBe(daycore)
    })

    it('is null when the sound matches no preset', () => {
        expect(activePreset(daycore, [nightcore, copy], 'slot-1')).toBeNull()
    })
})
