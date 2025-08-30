import { get } from 'svelte/store'
import { volumeStore } from '$lib/stores/volume'
import { loopStore } from '$lib/stores/loop'
import { configStore } from '$lib/stores/config'
import { nowPlaying } from '$lib/stores/now-playing'
import type { NowPlaying } from '$lib/stores/now-playing'

/**
 * Handles playback control operations
 * Single responsibility: Media playback control
 */
export class PlaybackController {
    private seeking: boolean = false

    get isControlEnabled(): boolean {
        return !this.seeking
    }

    setSeeking(seeking: boolean): void {
        this.seeking = seeking
    }

    mute(): void {
        volumeStore.mute()
    }

    unMute(): void {
        const volume = get(volumeStore)
        if (volume.muted) {
            volumeStore.unMute()
        }
    }

    skipTrack(): void {
        const volume = get(volumeStore)
        if (!volume.muted) {
            this.mute()
        }

        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        ) as HTMLButtonElement
        
        nextButton?.click()
    }

    updateCurrentTime(time: number): void {
        window.postMessage({ type: 'FROM_CURRENT_TIME_LISTENER', data: time }, '*')
    }

    shouldSkipTrack(songInfo: NowPlaying): boolean {
        return songInfo?.blocked || 
               configStore.checkIfTrackShouldBeSkipped({
                   title: songInfo?.title ?? '',
                   artist: songInfo?.artist ?? ''
               })
    }

    async handleLooping(currentTimeMS: number): Promise<boolean> {
        const loop = get(loopStore)
        const currentSong = get(nowPlaying)
        
        if (!loop.looping) return false

        if (loop.type === 'amount') {
            await loopStore.decrement()
        }
        
        this.updateCurrentTime(currentSong.snip?.start_time ?? 0)
        return true
    }
}