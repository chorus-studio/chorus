import { get } from 'svelte/store'
import { volumeStore } from '$lib/stores/volume'
import { loopStore } from '$lib/stores/loop'
import { configStore } from '$lib/stores/config'
import type { NowPlaying } from '$lib/stores/now-playing'
import { snipStore } from '$lib/stores/snip'

/**
 * Handles playback control operations
 * Single responsibility: Media playback control
 */
export class PlaybackController {
    private seeking: boolean = false
    private _mutedForSkip: boolean = false
    private unmuteTimer: ReturnType<typeof setTimeout> | null = null
    private holdTimer: ReturnType<typeof setTimeout> | null = null

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

    /**
     * Move on to the next track with the audio muted until it starts: the
     * track is blocked, or its snip has played out.
     */
    nextTrack(): void {
        const volume = get(volumeStore)
        if (!volume.muted) {
            this._mutedForSkip = true
            this.mute()
        }

        this.clickNext()
    }

    get mutedForSkip(): boolean {
        return this._mutedForSkip
    }

    clearMutedForSkip(): void {
        this._mutedForSkip = false
    }

    private clickNext(): void {
        // Clear the snip editor's draft so it can't be applied to the next track
        snipStore.reset()

        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        ) as HTMLButtonElement

        nextButton?.click()
    }

    updateCurrentTime(time: number): void {
        window.postMessage({ type: 'FROM_CURRENT_TIME_LISTENER', data: time }, '*')
    }

    /**
     * Seek within the track as a snip jump: muted for the moment of the seek,
     * and with polling paused until Spotify's elapsed label (whole seconds,
     * updated about once a second) has caught up with the new position —
     * otherwise the next tick would read the old position and seek again.
     */
    jumpTo(time: number, holdMs = 1000): void {
        this.setSeeking(true)
        const wasMuted = get(volumeStore).muted
        if (!wasMuted) this.mute()
        this.updateCurrentTime(time)

        if (this.unmuteTimer) clearTimeout(this.unmuteTimer)
        this.unmuteTimer = setTimeout(() => {
            this.unmuteTimer = null
            if (!wasMuted) this.unMute()
        }, 200)

        if (this.holdTimer) clearTimeout(this.holdTimer)
        this.holdTimer = setTimeout(() => {
            this.holdTimer = null
            this.setSeeking(false)
        }, holdMs)
    }

    /** Blocked by the user, or matched by a skip rule in the config. */
    isBlocked(songInfo: NowPlaying): boolean {
        return (
            songInfo?.blocked ||
            configStore.checkIfTrackShouldBeSkipped({
                title: songInfo?.title ?? '',
                artist: songInfo?.artist ?? '',
                duration: songInfo?.duration
            })
        )
    }

    /**
     * Loop back to `start` (the first play segment). False when a counted
     * loop has run out, in which case the caller moves on.
     */
    async handleLooping(start: number): Promise<boolean> {
        const loop = get(loopStore)

        if (!loop.looping) return false

        if (loop.type === 'infinite') {
            this.jumpTo(start)
            return true
        }

        if (loop.iteration >= 1) {
            await loopStore.decrement()
            this.jumpTo(start)
            return true
        }

        // No iterations left (iteration === 0), stop looping and advance
        await loopStore.resetIteration()
        return false
    }
}
