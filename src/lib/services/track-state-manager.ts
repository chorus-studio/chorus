import { get } from 'svelte/store'
import { seekStore } from '$lib/stores/seek'
import { playbackStore, defaultPlayback } from '$lib/stores/playback'
import { nowPlaying } from '$lib/stores/now-playing'
import { configStore, type AudioPreset } from '$lib/stores/config'

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

    async setPlayback(audioPreset?: AudioPreset): Promise<void> {
        if (!audioPreset) {
            const currentSong = get(nowPlaying)
            // Mirror the Speed page logic exactly: update store state before dispatching
            const track = currentSong?.playback ?? defaultPlayback
            await playbackStore.updatePlayback({ track, is_default: !currentSong?.playback })
            return
        }

        configStore.updateAudioPreset({ preset: audioPreset, type: 'playback' })
    }
}
