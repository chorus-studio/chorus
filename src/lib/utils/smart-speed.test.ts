import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))

import { get } from 'svelte/store'
import { seekStore } from '$lib/stores/seek'
import { SMART_SPEED_FACTOR, formatSaved, smartSpeedState, watchSmartSpeed } from './smart-speed'

describe('smartSpeedState', () => {
    it('is on only for long-form content with the switch on', () => {
        const base = get(seekStore)
        expect(smartSpeedState({ ...base, smart_speed: true, media_type: 'long_form' })).toEqual({
            enabled: true,
            factor: SMART_SPEED_FACTOR
        })
        expect(smartSpeedState({ ...base, smart_speed: true, media_type: 'default' }).enabled).toBe(
            false
        )
        expect(
            smartSpeedState({ ...base, smart_speed: false, media_type: 'long_form' }).enabled
        ).toBe(false)
    })
})

describe('formatSaved', () => {
    it('reads as seconds, minutes or hours', () => {
        expect(formatSaved(500)).toBeNull()
        expect(formatSaved(45_000)).toBe('45 s')
        expect(formatSaved(12 * 60_000 + 5000)).toBe('12 min')
        expect(formatSaved(65 * 60_000)).toBe('1 h 5 min')
        expect(formatSaved(120 * 60_000)).toBe('2 h')
    })
})

describe('watchSmartSpeed', () => {
    const posted: unknown[] = []
    const docListeners = new Map<string, () => void>()
    const winListeners = new Map<string, (e: unknown) => void>()
    let stop: () => void

    beforeEach(async () => {
        posted.length = 0
        docListeners.clear()
        winListeners.clear()
        vi.stubGlobal('window', {
            postMessage: (m: unknown) => posted.push(m),
            addEventListener: (type: string, fn: (e: unknown) => void) =>
                winListeners.set(type, fn),
            removeEventListener: () => {}
        })
        vi.stubGlobal('document', {
            addEventListener: (type: string, fn: () => void) => docListeners.set(type, fn),
            removeEventListener: () => {}
        })
        await seekStore.updateSeek({
            smart_speed: false,
            media_type: 'default',
            smart_speed_saved_ms: 0
        })
        stop = watchSmartSpeed()
    })

    it('sends the state once, again on changes, and again when the chain is built', async () => {
        expect(posted).toEqual([
            {
                type: 'FROM_SMART_SPEED_LISTENER',
                data: { enabled: false, factor: SMART_SPEED_FACTOR }
            }
        ])
        await seekStore.setSmartSpeed(true)
        expect(posted).toHaveLength(1)
        await seekStore.updateMediaType('long_form')
        expect(posted).toHaveLength(2)
        expect((posted[1] as any).data.enabled).toBe(true)
        await seekStore.updateSeek({ default: { rewind: 5, forward: 5 } })
        expect(posted).toHaveLength(2)
        docListeners.get('FROM_MEDIA_PLAY_INIT')?.()
        expect(posted).toHaveLength(3)
        stop()
    })

    it('banks the time the chain reports saved', async () => {
        winListeners.get('message')?.({
            source: globalThis.window,
            data: { type: 'FROM_SMART_SPEED_STATS', data: { saved_ms: 2500 } }
        })
        winListeners.get('message')?.({
            source: null,
            data: { type: 'FROM_SMART_SPEED_STATS', data: { saved_ms: 999 } }
        })
        await new Promise((r) => setTimeout(r, 0))
        expect(get(seekStore).smart_speed_saved_ms).toBe(2500)
        stop()
    })
})
