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

import { get } from 'svelte/store'
import { MS_MODE, msParamsStore, paramAudible } from './ms-params'

describe('paramAudible', () => {
    it('hears balance in every mode', () => {
        expect(paramAudible('balance', MS_MODE.mono)).toBe(true)
        expect(paramAudible('balance', MS_MODE.bypass)).toBe(true)
    })

    it('hears width only in the width mode', () => {
        expect(paramAudible('width', MS_MODE.width)).toBe(true)
        expect(paramAudible('width', MS_MODE.mono)).toBe(false)
    })

    it('hears a mid or side gain where the engine uses that half', () => {
        expect(paramAudible('midGain', MS_MODE.midOnly)).toBe(true)
        expect(paramAudible('midGain', MS_MODE.sideOnly)).toBe(false)
        expect(paramAudible('sideGain', MS_MODE.sideOnly)).toBe(true)
        expect(paramAudible('sideGain', MS_MODE.swap)).toBe(false)
    })
})

describe('msParamsStore.updateParam', () => {
    it('switches to the width mode when the dragged slider would be inaudible', async () => {
        msParamsStore.seed({ mode: MS_MODE.mono, width: 100, midGain: 0, sideGain: 0, balance: 0 })
        await msParamsStore.updateParam({ key: 'width', value: 150 })
        expect(get(msParamsStore)).toMatchObject({ mode: MS_MODE.width, width: 150 })
    })

    it('keeps the mode for a slider the mode already hears', async () => {
        msParamsStore.seed({ mode: MS_MODE.mono, width: 100, midGain: 0, sideGain: 0, balance: 0 })
        await msParamsStore.updateParam({ key: 'balance', value: -40 })
        expect(get(msParamsStore)).toMatchObject({ mode: MS_MODE.mono, balance: -40 })
    })

    it('reset config returns to the seeded preset', async () => {
        const wide = { mode: MS_MODE.width, width: 150, midGain: 0, sideGain: 0, balance: 0 }
        msParamsStore.seed(wide)
        await msParamsStore.updateParam({ key: 'width', value: 20 })
        await msParamsStore.resetToSeed()
        expect(get(msParamsStore)).toEqual(wide)
    })
})
