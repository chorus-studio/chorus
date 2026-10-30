import { get } from 'svelte/store'
import { dataStore } from '$lib/stores/data'
import { nowPlaying } from '$lib/stores/now-playing'

/**
 * A per-track volume offset, saved with the track like its speed: a percent
 * (100 = none) that multiplies the volume slider's level while the track
 * plays. For the one track that was mastered too quiet or too loud.
 */
export const TRACK_VOLUME_MIN = 25
export const TRACK_VOLUME_MAX = 200
export const TRACK_VOLUME_DEFAULT = 100
export const TRACK_VOLUME_STEP = 5

/** Whole percent inside the range; the default when not a number. */
export function clampTrackVolume(volume: unknown): number {
    if (volume == null || volume === '') return TRACK_VOLUME_DEFAULT
    const n = Number(volume)
    if (!Number.isFinite(n)) return TRACK_VOLUME_DEFAULT
    return Math.min(TRACK_VOLUME_MAX, Math.max(TRACK_VOLUME_MIN, Math.round(n)))
}

/** The gain factor a saved percent means; 1 for none. */
export function trackGainFactor(volume?: number | null): number {
    if (volume == null) return 1
    return clampTrackVolume(volume) / 100
}

/** Tell the page's audio chain the factor for the playing track. */
export function dispatchTrackVolume(volume?: number | null): void {
    if (typeof window === 'undefined') return
    window.postMessage(
        { type: 'FROM_TRACK_VOLUME_LISTENER', data: { factor: trackGainFactor(volume) } },
        '*'
    )
}

/**
 * Save the playing track's offset (null, or 100, clears it), mirror it into
 * the now-playing state and apply it.
 */
export async function saveTrackVolume(volume: number | null): Promise<void> {
    const state = get(nowPlaying)
    if (!state.track_id) return
    const value =
        volume == null || clampTrackVolume(volume) === TRACK_VOLUME_DEFAULT
            ? null
            : clampTrackVolume(volume)
    await dataStore.updateTrack({ track_id: state.track_id, value: { volume: value } })
    await nowPlaying.updateState({ volume: value })
    dispatchTrackVolume(value)
}
