import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

/**
 * The sleep timer: pause playback after a number of minutes, or when the
 * playing track ends. Set from the toolbar popup; the Spotify tab's watcher
 * (utils/sleep-timer.ts) does the fading and pausing.
 */
export const SLEEP_STORE_KEY = 'local:chorus_sleep'

export type SleepState = {
    /** When to pause (ms since epoch); null when not timed. */
    ends_at: number | null
    /** Pause when the playing track ends instead. */
    after_track: boolean
}

/** The minute choices the popup offers. */
export const SLEEP_CHOICES = [15, 30, 45, 60] as const
export type SleepChoice = (typeof SLEEP_CHOICES)[number] | 'track'

const defaultSleep: SleepState = { ends_at: null, after_track: false }

export const isSleepSet = (state: SleepState) => state.after_track || state.ends_at !== null

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

    /** Pause after `choice` minutes, or at the end of the playing track. */
    const start = (choice: SleepChoice, now = Date.now()) =>
        persist(
            choice === 'track'
                ? { ends_at: null, after_track: true }
                : { ends_at: now + choice * 60_000, after_track: false }
        )

    const stop = () => persist(defaultSleep)

    storage.getItem<SleepState>(SLEEP_STORE_KEY).then((saved) => {
        if (saved) store.set({ ...defaultSleep, ...saved })
    })

    storage.watch<SleepState>(SLEEP_STORE_KEY, (saved) => {
        if (isUpdatingStorage) return
        store.set(saved ? { ...defaultSleep, ...saved } : defaultSleep)
    })

    return { subscribe: store.subscribe, start, stop, get: () => get(store) }
}

export const sleepStore = createSleepStore()
