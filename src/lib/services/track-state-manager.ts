import { get } from 'svelte/store'
import { seekStore } from '$lib/stores/seek'
import { playbackStore, defaultPlayback } from '$lib/stores/playback'
import { nowPlaying } from '$lib/stores/now-playing'
import { dispatchTrackVolume } from '$lib/utils/track-volume'

/**
 * Manages track state and playback settings
 * Single responsibility: Track state and playback management
 */
export class TrackStateManager {
    async updateTrackType(): Promise<void> {
        const anchor = document.querySelector('[data-testid="context-item-info-title"] > span > a')
        const contextType = anchor?.getAttribute('href')?.split('/')?.at(1)

        if (!contextType) return

        const type = ['track', 'album'].includes(contextType) ? 'default' : 'long_form'
        const currentMediaType = get(seekStore).media_type

        if (currentMediaType !== type) {
            await seekStore.updateMediaType(type)
        }
    }

    /**
     * Point playback at the new track: its own saved speed when it has one,
     * otherwise the all-tracks default (which is where a quick preset lives).
     * Mirrors the Speed page: update store state before dispatching.
     */
    async setPlayback(): Promise<void> {
        const currentSong = get(nowPlaying)
        const track = currentSong?.playback ?? defaultPlayback
        await playbackStore.updatePlayback({ track, is_default: !currentSong?.playback })
        // Its volume offset rides along; a track without one plays at 1×.
        dispatchTrackVolume(currentSong?.volume)
    }
}
