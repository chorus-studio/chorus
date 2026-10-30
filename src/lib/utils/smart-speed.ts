import { get } from 'svelte/store'
import { seekStore, type SeekData } from '$lib/stores/seek'

/**
 * Smart speed for podcasts and audiobooks: the page's audio chain speeds
 * through silences (a gate on the signal, see audio-effects/silence-gate)
 * while the setting is on and long-form content is playing. This side tells
 * the chain the effective state and keeps the running total of time saved.
 */

/** How much faster the silences go than the current rate. */
export const SMART_SPEED_FACTOR = 2.5

export type SmartSpeedState = { enabled: boolean; factor: number }

export function smartSpeedState(seek: SeekData): SmartSpeedState {
    return {
        enabled: Boolean(seek.smart_speed) && seek.media_type === 'long_form',
        factor: SMART_SPEED_FACTOR
    }
}

/** "45 s", "12 min", "1 h 5 min"; null under a second. */
export function formatSaved(ms: number): string | null {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 1) return null
    if (seconds < 60) return `${seconds} s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Send the state whenever it changes and again when the chain is (re)built,
 * and bank the seconds the chain reports saved. Returns the unsubscribe.
 */
export function watchSmartSpeed(): () => void {
    let last = ''
    const post = (state: SmartSpeedState) =>
        window.postMessage({ type: 'FROM_SMART_SPEED_LISTENER', data: state }, '*')

    const unsubscribe = seekStore.subscribe((seek) => {
        const state = smartSpeedState(seek)
        const key = JSON.stringify(state)
        if (key === last) return
        last = key
        post(state)
    })

    const onInit = () => {
        last = ''
        post(smartSpeedState(get(seekStore)))
    }
    document.addEventListener('FROM_MEDIA_PLAY_INIT', onInit)

    const onStats = (event: MessageEvent) => {
        if (event.source !== window || event.data?.type !== 'FROM_SMART_SPEED_STATS') return
        const ms = Number(event.data.data?.saved_ms)
        if (ms > 0) void seekStore.addSaved(ms)
    }
    window.addEventListener('message', onStats)

    return () => {
        unsubscribe()
        document.removeEventListener('FROM_MEDIA_PLAY_INIT', onInit)
        window.removeEventListener('message', onStats)
    }
}
