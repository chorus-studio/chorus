import { get } from 'svelte/store'
import { loopStore } from '$lib/stores/loop'
import { mediaStore } from '$lib/stores/media'
import { configStore } from '$lib/stores/config'
import { effectsStore } from '$lib/stores/effects'
import { nowPlaying } from '$lib/stores/now-playing'
import { snipStore, type Snip } from '$lib/stores/snip'
import { playback } from '$lib/utils/playback'
import { playbackObserver } from '$lib/observers/playback'

// Refactored services
import { TrackStateManager } from '$lib/services/track-state-manager'
import { PlaybackController } from '$lib/services/playback-controller'
import { TrackNotificationService } from '$lib/services/track-notification-service'

export class TrackObserver {
    private trackStateManager: TrackStateManager
    private playbackController: PlaybackController
    private notificationService: TrackNotificationService
    private boundProcessMediaPlayInit: (event: CustomEvent) => void
    private _pollInterval: ReturnType<typeof setInterval> | null = null
    private _skipping = false

    constructor() {
        this.trackStateManager = new TrackStateManager()
        this.playbackController = new PlaybackController()
        this.notificationService = new TrackNotificationService()
        this.boundProcessMediaPlayInit = this.processMediaPlayInit.bind(this)
    }

    async initialize() {
        playbackObserver.updateChorusUI()
        await this.processSongTransition()

        // Poll playback position from Spotify's UI instead of FROM_MEDIA_TIMEUPDATE.
        // The UI always shows the correct track's position, avoiding stale
        // currentTime values from old MediaElement instances.
        this._pollInterval = setInterval(() => this.pollPlaybackPosition(), 200)

        document.addEventListener(
            'FROM_MEDIA_PLAY_INIT',
            this.boundProcessMediaPlayInit as EventListener
        )
    }

    private async processMediaPlayInit() {
        await this.trackStateManager.updateTrackType()
        await this.trackStateManager.setPlayback(this.audioPreset)
        this.setEffect()
    }

    // Simplified getters for commonly accessed stores
    get currentSong() {
        return get(nowPlaying)
    }

    get snip() {
        return get(snipStore)
    }

    get loop() {
        return get(loopStore)
    }

    get config() {
        return get(configStore)
    }

    get audioPreset() {
        return this.config.audio_presets.find((p) => p.active)
    }

    setEffect() {
        if (!this.audioPreset) return effectsStore.dispatchEffect()
        configStore.updateAudioPreset({ preset: this.audioPreset, type: 'effect' })
    }

    private isAtTempSnipEnd(currentTimeMS: number): boolean {
        const snip = this.snip as Snip
        return this.trackStateManager.isAtTempSnipEnd(currentTimeMS, snip)
    }

    private async updateTrackType(): Promise<void> {
        await this.trackStateManager.updateTrackType()
        playbackObserver.updateChorusUI()
    }

    private isAtTrackOrSnipEnd(currentTimeMS: number): boolean {
        return this.trackStateManager.isTrackAtSnipEnd(currentTimeMS, this.currentSong)
    }

    updateCurrentTime(time: number): void {
        this.playbackController.updateCurrentTime(time)
    }

    skipTrack(): void {
        this.playbackController.skipTrack()
    }

    async processSongTransition() {
        this._skipping = false
        const songInfo = this.currentSong

        if (this.playbackController.shouldSkipTrack(songInfo)) {
            return this.skipTrack()
        }

        if (songInfo?.snip) {
            this.playbackController.setSeeking(true)
            this.playbackController.mute()
        }

        setTimeout(() => {
            this.playbackController.unMute()
            this.playbackController.setSeeking(false)
        }, 100)

        await this.trackStateManager.setPlayback()
        await this.updateTrackType()
        this.setEffect()

        await this.notificationService.showTrackChangeNotification(songInfo)
    }

    private async pollPlaybackPosition() {
        if (!this.playbackController.isControlEnabled) return
        if (!this.currentSong) return
        if (this._skipping) return

        const currentSong = this.currentSong
        const positionSeconds = playback.current()
        if (positionSeconds == null) return

        const currentTimeMS = positionSeconds * 1000
        const snip = this.snip

        // Check if track should be skipped
        if (this.playbackController.shouldSkipTrack(currentSong)) {
            this._skipping = true
            return this.skipTrack()
        }

        // Handle snip start position
        if (currentSong.snip && currentTimeMS < currentSong.snip.start_time * 1000) {
            return this.updateCurrentTime(currentSong.snip.start_time)
        }

        // Handle temporary snip end
        if (this.snip && this.isAtTempSnipEnd(currentTimeMS)) {
            return this.updateCurrentTime(this.snip.start_time)
        }

        // Handle looping if at track/snip end.
        // For non-snip tracks, check 1s early to beat Spotify's auto-advance
        // at the natural track end (polling only sees integer seconds).
        const loopCheckMS = currentSong.snip ? currentTimeMS : currentTimeMS + 1000
        if (this.loop.looping && this.isAtTrackOrSnipEnd(loopCheckMS)) {
            // Suppress polls before calling handleLooping to prevent
            // multiple ticks from decrementing the loop count while
            // the UI still shows the old (pre-seek) position.
            this.playbackController.setSeeking(true)
            const loopHandled = await this.playbackController.handleLooping(currentTimeMS)
            if (loopHandled) {
                // Give UI ~1s to reflect the seek back to start
                setTimeout(() => this.playbackController.setSeeking(false), 1000)
                return
            }
            // Loop count exhausted, skip to next track
            this.playbackController.setSeeking(false)
            this._skipping = true
            this.skipTrack()
            return
        }

        // Handle shared snip URL cleanup
        if (snip?.is_shared && location?.search) {
            history.pushState(null, '', location.pathname)
        }

        // Check if at or past snip end for auto-advance
        const atSnipEnd = currentSong.snip && currentTimeMS >= currentSong.snip.end_time * 1000
        const atTrackEnd = currentTimeMS >= currentSong.duration * 1000 - 100

        // Handle track end or snip end
        const shouldSkip = (currentSong.snip || currentSong.blocked) && (atTrackEnd || atSnipEnd)

        if (shouldSkip) {
            this._skipping = true
            this.skipTrack()
            return
        }

        // Handle end of track after loop count exhausted (for non-snip tracks)
        if (this.loop.type === 'amount' && this.loop.iteration === 0 && atTrackEnd) {
            this._skipping = true
            this.skipTrack()
            return
        }
    }

    async disconnect() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval)
            this._pollInterval = null
        }

        document.removeEventListener(
            'FROM_MEDIA_PLAY_INIT',
            this.boundProcessMediaPlayInit as EventListener
        )

        // Clean up services
        this.notificationService.cleanup()

        const media = get(mediaStore)
        if (media.active) await mediaStore.setActive(false)
    }
}

export const trackObserver = new TrackObserver()
