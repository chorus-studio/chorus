import { get } from 'svelte/store'
import { sleepStore, type SleepState } from '$lib/stores/sleep'
import { mediaStore } from '$lib/stores/media'
import { nowPlaying } from '$lib/stores/now-playing'

/** The output fades over these last seconds before the pause. */
export const SLEEP_FADE_SECONDS = 5

/** Milliseconds until a timed sleep is due; null when it is not timed. */
export function sleepDueIn(state: SleepState, now = Date.now()): number | null {
    return state.ends_at === null ? null : Math.max(0, state.ends_at - now)
}

/** "in 23 min" / "in 1 h 5 min" / "in under a minute" / "at the end of this track"; null when off. */
export function sleepLabel(state: SleepState, now = Date.now()): string | null {
    if (state.after_track) return 'at the end of this track'
    const due = sleepDueIn(state, now)
    if (due === null) return null
    if (due < 60_000) return 'in under a minute'
    const minutes = Math.ceil(due / 60_000)
    if (minutes < 60) return `in ${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `in ${h} h ${m} min` : `in ${h} h`
}

/** The compact form for the popup header: "23m", "1h05", "track"; null when off. */
export function sleepShort(state: SleepState, now = Date.now()): string | null {
    if (state.after_track) return 'track'
    const due = sleepDueIn(state, now)
    if (due === null) return null
    const minutes = Math.ceil(due / 60_000)
    if (minutes < 60) return `${Math.max(1, minutes)}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h${String(m).padStart(2, '0')}`
}

/**
 * Run the sleep timer in the Spotify tab. A timed sleep fades the output over
 * its last seconds and pauses when due; "end of track" fades over the track's
 * last seconds and pauses as the next one starts, before it is heard. The
 * fade is a gain ramp in the page's audio chain (FROM_SLEEP_LISTENER); when
 * the chain is not built the pause is simply abrupt. Turning the timer off
 * mid-fade puts the volume back. Returns the unsubscribe.
 */
export function watchSleepTimer(): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null
    let fading = false
    let lastTrack: string | null = null

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
            if (!state.after_track) undoFade()
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
        const changed = lastTrack !== null && state.track_id !== lastTrack
        lastTrack = state.track_id
        if (!sleep.after_track) return
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
