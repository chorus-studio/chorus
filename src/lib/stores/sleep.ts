import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

/**
 * The sleep timer: pause playback after a number of minutes, or when the
 * playing item (a track, a podcast episode, an audiobook chapter) ends. Set
 * from the popover's Sleep tab or the toolbar popup; the Spotify tab's
 * watcher (utils/sleep-timer.ts) does the fading and pausing.
 */
export const SLEEP_STORE_KEY = 'local:chorus_sleep'

export type SleepState = {
    /** When to pause (ms since epoch); null when not timed. */
    ends_at: number | null
    /** When the timed sleep was set (ms); the Sleep tab's bar runs from here. */
    started_at: number | null
    /** Pause when the playing item ends instead. */
    at_end: boolean
    /** The custom tile's last value, kept across timers. */
    custom_minutes: number
}

/** The quick tiles, in minutes. */
export const SLEEP_CHOICES = [15, 30, 45, 60] as const
/** Any length from a minute to twelve hours. */
export const SLEEP_MIN_MINUTES = 1
export const SLEEP_MAX_MINUTES = 720
export const DEFAULT_CUSTOM_MINUTES = 20
/** Minutes, or 'end' for the end of the playing item. */
export type SleepChoice = number | 'end'

const defaultSleep: SleepState = {
    ends_at: null,
    started_at: null,
    at_end: false,
    custom_minutes: DEFAULT_CUSTOM_MINUTES
}

export const isSleepSet = (state: SleepState) => state.at_end || state.ends_at !== null

/** Whole minutes within the allowed range; anything that is not a number becomes null. */
export function clampMinutes(value: unknown): number | null {
    const n = Math.round(Number(value))
    if (!Number.isFinite(n)) return null
    return Math.min(SLEEP_MAX_MINUTES, Math.max(SLEEP_MIN_MINUTES, n))
}

/** A saved state from any version: `after_track` was the first name of `at_end`. */
export function normalizeSleep(
    saved: (Partial<SleepState> & { after_track?: boolean }) | null | undefined
): SleepState {
    if (!saved) return defaultSleep
    const { after_track, ...rest } = saved
    return { ...defaultSleep, ...rest, at_end: rest.at_end ?? after_track ?? false }
}

function createSleepStore() {
    const store = writable<SleepState>(defaultSleep)
    let isUpdatingStorage = false

    async function persist(state: SleepState) {
        store.set(state)
        isUpdatingStorage = true
        try {
            await storage.setItem<SleepState>(SLEEP_STORE_KEY, state)
        } catch (error) {
            console.error('Error saving sleep timer:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    /** Pause after `choice` minutes, or at the end of the playing item. */
    const start = (choice: SleepChoice, now = Date.now()) => {
        const { custom_minutes } = get(store)
        if (choice === 'end') {
            return persist({ ends_at: null, started_at: null, at_end: true, custom_minutes })
        }
        const minutes = clampMinutes(choice)
        if (minutes === null) return Promise.resolve()
        return persist({
            ends_at: now + minutes * 60_000,
            started_at: now,
            at_end: false,
            custom_minutes
        })
    }

    /** Add minutes to a timed sleep; with nothing timed, start one. */
    const extend = (minutes: number, now = Date.now()) => {
        const state = get(store)
        if (state.ends_at === null) return start(minutes, now)
        return persist({ ...state, ends_at: Math.max(state.ends_at, now) + minutes * 60_000 })
    }

    /** Remember the custom tile's value without starting anything. */
    const setCustomMinutes = (value: number) => {
        const minutes = clampMinutes(value)
        if (minutes === null) return Promise.resolve()
        return persist({ ...get(store), custom_minutes: minutes })
    }

    const stop = () => persist({ ...defaultSleep, custom_minutes: get(store).custom_minutes })

    storage.getItem<SleepState>(SLEEP_STORE_KEY).then((saved) => {
        if (saved) store.set(normalizeSleep(saved))
    })

    storage.watch<SleepState>(SLEEP_STORE_KEY, (saved) => {
        if (isUpdatingStorage) return
        store.set(normalizeSleep(saved))
    })

    return {
        subscribe: store.subscribe,
        start,
        extend,
        setCustomMinutes,
        stop,
        get: () => get(store)
    }
}

export const sleepStore = createSleepStore()
