import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))
vi.mock('$lib/stores/media', async () => {
    const { writable } = await import('svelte/store')
    return { mediaStore: writable({ playing: true }) }
})
vi.mock('$lib/stores/now-playing', async () => {
    const { writable } = await import('svelte/store')
    return { nowPlaying: writable({ track_id: 't1', duration: 200, current: 0 }) }
})

import { get, type Writable } from 'svelte/store'
import { sleepStore } from '$lib/stores/sleep'
import { mediaStore as mediaStoreMock } from '$lib/stores/media'
import { nowPlaying as nowPlayingMock } from '$lib/stores/now-playing'
import {
    SLEEP_FADE_SECONDS,
    sleepDueIn,
    sleepLabel,
    sleepShort,
    watchSleepTimer
} from './sleep-timer'

// The mocks above are plain writables standing in for the real stores.
const mediaStore = mediaStoreMock as unknown as Writable<{ playing: boolean }>
const nowPlaying = nowPlayingMock as unknown as Writable<{
    track_id: string
    duration: number
    current: number
}>

const MIN = 60_000
const NOW = 1_700_000_000_000

describe('labels', () => {
    it('describe a timed sleep in minutes and hours', () => {
        expect(sleepLabel({ ends_at: NOW + 23 * MIN, after_track: false }, NOW)).toBe('in 23 min')
        expect(sleepLabel({ ends_at: NOW + 65 * MIN, after_track: false }, NOW)).toBe(
            'in 1 h 5 min'
        )
        expect(sleepLabel({ ends_at: NOW + 120 * MIN, after_track: false }, NOW)).toBe('in 2 h')
        expect(sleepLabel({ ends_at: NOW + 10_000, after_track: false }, NOW)).toBe(
            'in under a minute'
        )
        expect(sleepLabel({ ends_at: null, after_track: true }, NOW)).toBe(
            'at the end of this track'
        )
        expect(sleepLabel({ ends_at: null, after_track: false }, NOW)).toBeNull()
    })

    it('have a compact form for the header', () => {
        expect(sleepShort({ ends_at: NOW + 22.2 * MIN, after_track: false }, NOW)).toBe('23m')
        expect(sleepShort({ ends_at: NOW + 65 * MIN, after_track: false }, NOW)).toBe('1h05')
        expect(sleepShort({ ends_at: NOW + 1000, after_track: false }, NOW)).toBe('1m')
        expect(sleepShort({ ends_at: null, after_track: true }, NOW)).toBe('track')
        expect(sleepShort({ ends_at: null, after_track: false }, NOW)).toBeNull()
    })

    it('never report a negative due time', () => {
        expect(sleepDueIn({ ends_at: NOW - 5000, after_track: false }, NOW)).toBe(0)
        expect(sleepDueIn({ ends_at: null, after_track: false }, NOW)).toBeNull()
    })
})

describe('watchSleepTimer', () => {
    const posted: unknown[] = []
    const click = vi.fn()
    let stop: () => void

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
        posted.length = 0
        click.mockClear()
        vi.stubGlobal('window', { postMessage: (msg: unknown) => posted.push(msg) })
        vi.stubGlobal('document', { querySelector: () => ({ click }) })
        mediaStore.set({ playing: true })
        nowPlaying.set({ track_id: 't1', duration: 200, current: 0 })
        stop = watchSleepTimer()
    })

    afterEach(() => {
        stop()
        void sleepStore.stop()
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    const fades = () => posted.filter((m: any) => m.data.action === 'fade')
    const restores = () => posted.filter((m: any) => m.data.action === 'restore')

    it('fades over the last seconds of a timed sleep, then pauses and clears', async () => {
        await sleepStore.start(15)
        await vi.advanceTimersByTimeAsync(15 * MIN - SLEEP_FADE_SECONDS * 1000 - 1)
        expect(fades()).toHaveLength(0)
        await vi.advanceTimersByTimeAsync(1)
        expect(fades()).toEqual([
            { type: 'FROM_SLEEP_LISTENER', data: { action: 'fade', seconds: SLEEP_FADE_SECONDS } }
        ])
        expect(click).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(SLEEP_FADE_SECONDS * 1000)
        expect(click).toHaveBeenCalledTimes(1)
        expect(restores()).toHaveLength(1)
        expect(get(sleepStore)).toEqual({ ends_at: null, after_track: false })
    })

    it('does not press pause when nothing is playing', async () => {
        mediaStore.set({ playing: false })
        await sleepStore.start(15)
        await vi.advanceTimersByTimeAsync(15 * MIN + 10)
        expect(click).not.toHaveBeenCalled()
        expect(get(sleepStore).ends_at).toBeNull()
    })

    it('puts the volume back when turned off mid-fade', async () => {
        await sleepStore.start(15)
        await vi.advanceTimersByTimeAsync(15 * MIN - 2000)
        expect(fades()).toHaveLength(1)
        await sleepStore.stop()
        expect(restores()).toHaveLength(1)
        await vi.advanceTimersByTimeAsync(5000)
        expect(click).not.toHaveBeenCalled()
    })

    it('for the end of the track, fades in its last seconds and pauses as the next starts', async () => {
        await sleepStore.start('track')
        nowPlaying.set({ track_id: 't1', duration: 200, current: 150 })
        expect(fades()).toHaveLength(0)
        nowPlaying.set({ track_id: 't1', duration: 200, current: 197 })
        expect(fades()).toEqual([
            { type: 'FROM_SLEEP_LISTENER', data: { action: 'fade', seconds: 3 } }
        ])
        nowPlaying.set({ track_id: 't2', duration: 180, current: 0 })
        await vi.advanceTimersByTimeAsync(0)
        expect(click).toHaveBeenCalledTimes(1)
        expect(restores()).toHaveLength(1)
        expect(get(sleepStore).after_track).toBe(false)
    })

    it('a sleep already past when the tab loads pauses straight away', async () => {
        await sleepStore.start(15, NOW - 20 * MIN)
        await vi.advanceTimersByTimeAsync(0)
        expect(click).toHaveBeenCalledTimes(1)
    })
})
