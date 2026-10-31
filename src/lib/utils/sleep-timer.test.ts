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
import {
    DEFAULT_CUSTOM_MINUTES,
    SLEEP_MAX_MINUTES,
    normalizeSleep,
    sleepStore,
    type SleepState
} from '$lib/stores/sleep'
import { mediaStore as mediaStoreMock } from '$lib/stores/media'
import { nowPlaying as nowPlayingMock } from '$lib/stores/now-playing'
import {
    SLEEP_FADE_SECONDS,
    sleepCountdown,
    sleepDueIn,
    sleepLabel,
    sleepNoun,
    sleepProgress,
    sleepShort,
    watchSleepTimer
} from './sleep-timer'

// The mocks above are plain writables standing in for the real stores.
const mediaStore = mediaStoreMock as unknown as Writable<{ playing: boolean }>
const nowPlaying = nowPlayingMock as unknown as Writable<{
    track_id: string
    id?: string
    duration: number
    current: number
}>

const MIN = 60_000
const NOW = 1_700_000_000_000
const off: SleepState = {
    ends_at: null,
    started_at: null,
    at_end: false,
    custom_minutes: DEFAULT_CUSTOM_MINUTES
}
const timed = (minutes: number, startedMinutesAgo = 0): SleepState => ({
    ...off,
    ends_at: NOW + minutes * MIN,
    started_at: NOW - startedMinutesAgo * MIN
})
const atEnd: SleepState = { ...off, at_end: true }

describe('labels', () => {
    it('describe a timed sleep in minutes and hours', () => {
        expect(sleepLabel(timed(23), NOW)).toBe('in 23 min')
        expect(sleepLabel(timed(65), NOW)).toBe('in 1 h 5 min')
        expect(sleepLabel(timed(120), NOW)).toBe('in 2 h')
        expect(sleepLabel({ ...off, ends_at: NOW + 10_000 }, NOW)).toBe('in under a minute')
        expect(sleepLabel(off, NOW)).toBeNull()
    })

    it('name the playing item: a track, or an episode for shows and audiobooks', () => {
        expect(sleepLabel(atEnd, NOW)).toBe('at the end of this track')
        expect(sleepLabel(atEnd, NOW, 'episode')).toBe('at the end of this episode')
        expect(sleepNoun('default')).toBe('track')
        expect(sleepNoun('long_form')).toBe('episode')
        expect(sleepNoun(undefined)).toBe('track')
    })

    it('have a compact form for the header and the tray', () => {
        expect(sleepShort({ ...off, ends_at: NOW + 22.2 * MIN }, NOW)).toBe('23m')
        expect(sleepShort(timed(65), NOW)).toBe('1h05')
        expect(sleepShort({ ...off, ends_at: NOW + 1000 }, NOW)).toBe('1m')
        expect(sleepShort(atEnd, NOW)).toBe('end')
        expect(sleepShort(off, NOW)).toBeNull()
    })

    it('count down to the second for the Sleep tab', () => {
        expect(sleepCountdown({ ...off, ends_at: NOW + 23 * MIN + 40_000 }, NOW)).toBe('23:40')
        expect(sleepCountdown({ ...off, ends_at: NOW + 65 * MIN + 12_000 }, NOW)).toBe('1:05:12')
        expect(sleepCountdown({ ...off, ends_at: NOW + 400 }, NOW)).toBe('0:01')
        expect(sleepCountdown(atEnd, NOW)).toBeNull()
    })

    it('measure how much of a timed sleep has run', () => {
        expect(sleepProgress(timed(23, 7), NOW)).toBeCloseTo(7 / 30)
        expect(sleepProgress(timed(30), NOW)).toBe(0)
        expect(sleepProgress({ ...timed(0, 30), ends_at: NOW - 1 }, NOW)).toBe(1)
        // A timer saved before started_at existed has no bar.
        expect(sleepProgress({ ...timed(10), started_at: null }, NOW)).toBeNull()
        expect(sleepProgress(atEnd, NOW)).toBeNull()
    })

    it('never report a negative due time', () => {
        expect(sleepDueIn({ ...off, ends_at: NOW - 5000 }, NOW)).toBe(0)
        expect(sleepDueIn(off, NOW)).toBeNull()
    })
})

describe('sleepStore', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
    })
    afterEach(async () => {
        await sleepStore.stop()
        await sleepStore.setCustomMinutes(DEFAULT_CUSTOM_MINUTES)
        vi.useRealTimers()
    })

    it('takes any length, clamped to a minute and twelve hours', async () => {
        await sleepStore.start(25)
        expect(get(sleepStore)).toMatchObject({ ends_at: NOW + 25 * MIN, started_at: NOW })
        await sleepStore.start(9000)
        expect(get(sleepStore).ends_at).toBe(NOW + SLEEP_MAX_MINUTES * MIN)
        await sleepStore.start(0)
        expect(get(sleepStore).ends_at).toBe(NOW + MIN)
        await sleepStore.start(Number.NaN)
        expect(get(sleepStore).ends_at).toBe(NOW + MIN)
    })

    it('extends a running timer from its end, and starts one when nothing is timed', async () => {
        await sleepStore.start(15)
        await sleepStore.extend(15)
        expect(get(sleepStore)).toMatchObject({ ends_at: NOW + 30 * MIN, started_at: NOW })
        await sleepStore.stop()
        await sleepStore.extend(15)
        expect(get(sleepStore)).toMatchObject({ ends_at: NOW + 15 * MIN, at_end: false })
    })

    it('keeps the custom tile value across timers', async () => {
        await sleepStore.setCustomMinutes(25)
        await sleepStore.start('end')
        expect(get(sleepStore)).toMatchObject({ at_end: true, ends_at: null, custom_minutes: 25 })
        await sleepStore.stop()
        expect(get(sleepStore)).toEqual({ ...off, custom_minutes: 25 })
    })

    it('reads a state saved by the first version', () => {
        expect(normalizeSleep({ ends_at: null, after_track: true })).toEqual({
            ...off,
            at_end: true
        })
        expect(normalizeSleep({ ends_at: NOW, after_track: false })).toEqual({
            ...off,
            ends_at: NOW
        })
        expect(normalizeSleep(null)).toEqual(off)
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
        expect(get(sleepStore)).toEqual(off)
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

    it('a timer extended mid-fade keeps playing, at full volume', async () => {
        await sleepStore.start(15)
        await vi.advanceTimersByTimeAsync(15 * MIN - 2000)
        expect(fades()).toHaveLength(1)
        await sleepStore.extend(15)
        await vi.advanceTimersByTimeAsync(5000)
        expect(click).not.toHaveBeenCalled()
        // The fade is not undone (the state is still timed) but the next one
        // is scheduled from the new end.
        await vi.advanceTimersByTimeAsync(15 * MIN)
        expect(click).toHaveBeenCalledTimes(1)
    })

    it('for the end of the track, fades in its last seconds and pauses as the next starts', async () => {
        await sleepStore.start('end')
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
        expect(get(sleepStore).at_end).toBe(false)
    })

    it('for the end of an episode, whose track id never changes, goes by the title', async () => {
        // Episodes and chapters link to /episode/ or /show/, so the store's
        // track_id stays whatever it last was; only the widget's id moves.
        nowPlaying.set({
            track_id: '',
            id: 'Why we sleep by The Daily',
            duration: 1800,
            current: 100
        })
        await sleepStore.start('end')
        nowPlaying.set({
            track_id: '',
            id: 'Why we sleep by The Daily',
            duration: 1800,
            current: 1796
        })
        expect(fades()).toHaveLength(1)
        nowPlaying.set({
            track_id: '',
            id: 'The next one by The Daily',
            duration: 1500,
            current: 0
        })
        await vi.advanceTimersByTimeAsync(0)
        expect(click).toHaveBeenCalledTimes(1)
        expect(restores()).toHaveLength(1)
        expect(get(sleepStore).at_end).toBe(false)
    })

    it('a sleep already past when the tab loads pauses straight away', async () => {
        await sleepStore.start(15, NOW - 20 * MIN)
        await vi.advanceTimersByTimeAsync(0)
        expect(click).toHaveBeenCalledTimes(1)
    })
})
