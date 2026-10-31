import { get } from 'svelte/store'
import { sleepStore, type SleepState } from '$lib/stores/sleep'
import { mediaStore } from '$lib/stores/media'
import { nowPlaying } from '$lib/stores/now-playing'
import { featureOn } from '$lib/utils/features'
import { toSegments, type Snip } from '$lib/utils/snip-ranges'
import { secondsToTime } from '$lib/utils/time'

/** The output fades over these last seconds before the pause. */
export const SLEEP_FADE_SECONDS = 5
/**
 * "End of this item" pauses this close to the end rather than waiting for the
 * next item to start: Spotify's position label is whole seconds, and the
 * handover (or a repeat of the same item) can come before any tick sees it.
 */
export const SLEEP_END_SECONDS = 1
/** The volume goes back this long after the pause, so the last second is not heard at full volume. */
export const SLEEP_RESTORE_DELAY_MS = 500

/** What the playing item is called. Spotify's web links can't tell an audiobook chapter from a podcast episode, so both are episodes. */
export type SleepNoun = 'track' | 'episode'
export const sleepNoun = (mediaType: 'default' | 'long_form' | undefined): SleepNoun =>
    mediaType === 'long_form' ? 'episode' : 'track'

/** What the timer reads off the now-playing store. */
type PlayingItem = { duration: number; current: number; snip?: Snip | null }

/**
 * Where the playing item hands over, in seconds from its start: the end of its
 * last play section when it carries a snip (and snips are on), else its
 * length; null while the length is unknown.
 */
export function sleepItemEnd(item: PlayingItem): number | null {
    if (!(item.duration > 0)) return null
    const segments = featureOn('snips') ? toSegments(item.snip ?? null, item.duration) : []
    return segments.at(-1)?.end ?? item.duration
}

/** Seconds left before the playing item hands over; null while its length is unknown. */
export function sleepItemRemaining(item: PlayingItem): number | null {
    const end = sleepItemEnd(item)
    return end === null ? null : Math.max(0, end - item.current)
}

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

/**
 * The compact form for the popup header and the player tray: "23m", "1h05";
 * at the end of the item, the time left in it ("2:28"), or "end" until that
 * is known. null when off.
 */
export function sleepShort(
    state: SleepState,
    now = Date.now(),
    itemLeft: number | null = null
): string | null {
    if (state.at_end) {
        return itemLeft === null ? 'end' : secondsToTime(Math.max(0, Math.round(itemLeft)))
    }
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
 * its last seconds and pauses when due. "End of this item" fades over the
 * item's last seconds (its last snip section's, when it carries one) and
 * pauses a second before it hands over, so neither the next item nor a repeat
 * of this one is heard; the playback poll (observers/track) leaves the end
 * alone meanwhile. The fade is a volume ramp in the page (FROM_SLEEP_LISTENER).
 * Turning the timer off mid-fade puts the volume back. Returns the unsubscribe.
 */
export function watchSleepTimer(): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null
    let restoreTimer: ReturnType<typeof setTimeout> | null = null
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

    /** Press pause while something plays, by the button's own label; the store's flag stands in when the label is not English. */
    function pressPause() {
        const button = document.querySelector<HTMLButtonElement>(
            'button[data-testid="control-button-playpause"]'
        )
        if (!button) return
        const label = button.getAttribute('aria-label')
        const playing = label === 'Pause' || (label !== 'Play' && get(mediaStore).playing)
        if (playing) button.click()
    }

    async function finish() {
        clearTimer()
        pressPause()
        // Back to the set volume a moment after the pause, so the last second
        // is not heard at full volume and the next play is not silent.
        fading = false
        if (restoreTimer) clearTimeout(restoreTimer)
        restoreTimer = setTimeout(() => post({ action: 'restore' }), SLEEP_RESTORE_DELAY_MS)
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
        // Items are told apart by the widget's "Title by Artist" id, the key the
        // store itself uses: episodes and chapters have one too, while track_id
        // is only filled from a /track/ link and never changes across a show.
        const item = state.id || state.track_id || null
        const changed = lastItem !== null && item !== lastItem
        lastItem = item
        if (!sleep.at_end) return
        // Spotify moved on before the pause landed (a short item, a missed
        // tick): pause now, before the next one is heard.
        if (changed) {
            void finish()
            return
        }
        const remaining = sleepItemRemaining(state)
        if (remaining === null) return
        if (remaining <= SLEEP_END_SECONDS) {
            void finish()
            return
        }
        if (remaining <= SLEEP_FADE_SECONDS) fade(remaining)
    })

    return () => {
        clearTimer()
        if (restoreTimer) clearTimeout(restoreTimer)
        unsubscribeSleep()
        unsubscribeNow()
    }
}
