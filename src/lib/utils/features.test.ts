import { describe, expect, it, vi } from 'vitest'

vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))

import { get } from 'svelte/store'
import { settingsStore } from '$lib/stores/settings'
import { FEATURES, featureOn, setFeature } from './features'

describe('features', () => {
    it('lists the three pausable features', () => {
        expect(FEATURES.map((f) => f.key)).toEqual(['snips', 'blocks', 'effects'])
    })

    it('is on by default and after a settings record without the switches', async () => {
        expect(featureOn('snips')).toBe(true)
        const { features: _drop, ...older } = get(settingsStore)
        await settingsStore.updateSettings({ ...older, features: undefined as never })
        expect(featureOn('blocks')).toBe(true)
    })

    it('pauses and resumes one feature at a time', async () => {
        await settingsStore.updateSettings({
            features: { snips: true, blocks: true, effects: true }
        })
        await setFeature('effects', false)
        expect(featureOn('effects')).toBe(false)
        expect(featureOn('snips')).toBe(true)
        await setFeature('effects', true)
        expect(featureOn('effects')).toBe(true)
    })
})
