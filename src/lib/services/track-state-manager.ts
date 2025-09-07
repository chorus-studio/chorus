import { get } from 'svelte/store'
import { seekStore } from '$lib/stores/seek'
import { playbackStore } from '$lib/stores/playback'
import { nowPlaying } from '$lib/stores/now-playing'
import type { SimpleTrack } from '$lib/stores/data/cache'
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

    setPlayback(audioPreset?: AudioPreset): void {
        if (!audioPreset) {
            const currentSong = get(nowPlaying)
            const playback = currentSong?.playback ?? get(playbackStore).default
            if (!playback) playbackStore.dispatchPlaybackSettings(playback)
            return
        }

        configStore.updateAudioPreset({ preset: audioPreset, type: 'playback' })
    }

    isTrackAtSnipEnd(currentTimeMS: number, track: SimpleTrack): boolean {
        const currentSong = get(nowPlaying)
        const { end_time = currentSong.duration } = track?.snip ?? {}
        const atSongEnd = end_time === currentSong.duration
        const endTimeMS = end_time * 1000 - (atSongEnd ? 100 : 0)

        return currentTimeMS >= endTimeMS
    }

    isAtTempSnipEnd(
        currentTimeMS: number,
        snip: { end_time?: number; last_updated?: string }
    ): boolean {
        const { end_time, last_updated } = snip
        if (!end_time || !last_updated) return false

        const currentSong = get(nowPlaying)
        const endTimeMS = end_time * 1000 - 100
        const lastUpdateSet = !!last_updated
        const loopEndTimeMS =
            !lastUpdateSet || last_updated === 'start' ? endTimeMS : endTimeMS + 3000

        return (
            !Number.isNaN(endTimeMS) &&
            currentTimeMS > Math.min(loopEndTimeMS, currentSong.duration * 1000)
        )
    }
}
