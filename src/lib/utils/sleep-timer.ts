import { get } from 'svelte/store'
import { sleepStore, type SleepState } from '$lib/stores/sleep'
import { mediaStore } from '$lib/stores/media'
import { nowPlaying } from '$lib/stores/now-playing'
import { secondsToTime } from '$lib/utils/time'

/** The output fades over these last seconds before the pause. */
export const SLEEP_FADE_SECONDS = 5

/** What the playing item is called. Spotify's web links can't tell an audiobook chapter from a podcast episode, so both are episodes. */
export type SleepNoun = 'track' | 'episode'
export const sleepNoun = (mediaType: 'default' | 'long_form' | undefined): SleepNoun =>
    mediaType === 'long_form' ? 'episode' : 'track'

/** Milliseconds until a timed sleep is due; null when it is not timed. */
export function sleepDueIn(state: SleepState, now = Date.now()): number | null {
    return state.ends_at === null ? null : Math.max(0, state.ends_at - now)
}

/** "in 23 min" / "in 1 h 5 min" / "in under a minute" / "at the end of this track"; null when off. */
export function sleepLabel(
    state: SleepState,
    now = Date.now(),
    noun: SleepNoun = 'track'
): string | null {
    if (state.at_end) return `at the end of this ${noun}`
    const due = sleepDueIn(state, now)
    if (due === null) return null
    if (due < 60_000) return 'in under a minute'
    const minutes = Math.ceil(due / 60_000)
    if (minutes < 60) return `in ${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `in ${h} h ${m} min` : `in ${h} h`
}

/** The compact form for the popup header and the player tray: "23m", "1h05", "end"; null when off. */
export function sleepShort(state: SleepState, now = Date.now()): string | null {
    if (state.at_end) return 'end'
    const due = sleepDueIn(state, now)
    if (due === null) return null
    const minutes = Math.ceil(due / 60_000)
    if (minutes < 60) return `${Math.max(1, minutes)}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h${String(m).padStart(2, '0')}`
}

/** "23:40" / "1:05:12": the time left on a timed sleep, to the second; null when not timed. */
export function sleepCountdown(state: SleepState, now = Date.now()): string | null {
    const due = sleepDueIn(state, now)
    if (due === null) return null
    return secondsToTime(Math.ceil(due / 1000))
}

/** How much of a timed sleep has run, 0..1; null when not timed (or saved before started_at was kept). */
export function sleepProgress(state: SleepState, now = Date.now()): number | null {
    if (state.ends_at === null || state.started_at === null) return null
    const total = state.ends_at - state.started_at
    if (total <= 0) return 1
    return Math.min(1, Math.max(0, (now - state.started_at) / total))
}

/** The clock time a timed sleep pauses at, in the user's locale; null when not timed. */
export function sleepEndsAtClock(state: SleepState): string | null {
    if (state.ends_at === null) return null
    return new Date(state.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * Run the sleep timer in the Spotify tab. A timed sleep fades the output over
 * its last seconds and pauses when due; "end of this item" fades over the
 * item's last seconds and pauses as the next one starts, before it is heard.
 * The fade is a gain ramp in the page's audio chain (FROM_SLEEP_LISTENER);
 * when the chain is not built the pause is simply abrupt. Turning the timer
 * off mid-fade puts the volume back. Returns the unsubscribe.
 */
export function watchSleepTimer(): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null
    let fading = false
    let lastItem: string | null = null

    const post = (data: { action: 'fade'; seconds: number } | { action: 'restore' }) =>
        window.postMessage({ type: 'FROM_SLEEP_LISTENER', data }, '*')

    const clearTimer = () => {
        if (timer) clearTimeout(timer)
        timer = null
    }

    function fade(seconds: number) {
        if (fading) return
        fading = true
        post({ action: 'fade', seconds })
    }

    function undoFade() {
        if (!fading) return
        fading = false
        post({ action: 'restore' })
    }

    async function finish() {
        clearTimer()
        if (get(mediaStore).playing) {
            document
                .querySelector<HTMLButtonElement>('button[data-testid="control-button-playpause"]')
                ?.click()
        }
        // Back to the set volume once paused, so the next play is not silent.
        fading = false
        post({ action: 'restore' })
        await sleepStore.stop()
    }

    const unsubscribeSleep = sleepStore.subscribe((state) => {
        clearTimer()
        if (state.ends_at === null) {
            if (!state.at_end) undoFade()
            return
        }
        const due = state.ends_at - Date.now()
        if (due <= 0) {
            void finish()
            return
        }
        const fadeFor = Math.min(SLEEP_FADE_SECONDS, due / 1000)
        timer = setTimeout(
            () => {
                fade(fadeFor)
                timer = setTimeout(() => void finish(), fadeFor * 1000)
            },
            due - fadeFor * 1000
        )
    })

    const unsubscribeNow = nowPlaying.subscribe((state) => {
        const sleep = get(sleepStore)
        // The item is told apart by the widget's "Title by Artist" id, the
        // same key the store itself uses: episodes and chapters have one too,
        // while track_id is only filled from a /track/ link and never
        // changes across a show.
        const item = state.id || state.track_id || null
        const changed = lastItem !== null && item !== lastItem
        lastItem = item
        if (!sleep.at_end) return
        if (changed) {
            void finish()
            return
        }
        const remaining = state.duration > 0 ? state.duration - state.current : Infinity
        if (remaining <= SLEEP_FADE_SECONDS) fade(Math.max(0.5, remaining))
    })

    return () => {
        clearTimer()
        unsubscribeSleep()
        unsubscribeNow()
    }
}
