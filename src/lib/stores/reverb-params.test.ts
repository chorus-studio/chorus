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

import { defaultReverbParams, migrateReverbMix } from './reverb-params'

describe('migrateReverbMix', () => {
    it('keeps the balance a config had beside the old gain-1.0 bypass', () => {
        const old = { ...defaultReverbParams, dry: 0.6, wet: 0.3 }
        const next = migrateReverbMix(old)
        expect(next.dry).toBe(1)
        expect(next.wet).toBeCloseTo(0.3 / 1.6, 3)
    })

    it('leaves a config with no worklet dry at the same wet', () => {
        const old = { ...defaultReverbParams, dry: 0, wet: 0.5 }
        expect(migrateReverbMix(old)).toMatchObject({ dry: 1, wet: 0.5 })
    })

    it('touches nothing else', () => {
        const old = { ...defaultReverbParams, decay: 0.9, dry: 0.4, wet: 0.7 }
        expect(migrateReverbMix(old).decay).toBe(0.9)
    })
})
