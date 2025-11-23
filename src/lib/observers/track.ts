import { get } from 'svelte/store'
import { loopStore } from '$lib/stores/loop'
import { mediaStore } from '$lib/stores/media'
import { configStore } from '$lib/stores/config'
import { effectsStore } from '$lib/stores/effects'
import { nowPlaying } from '$lib/stores/now-playing'
import { snipStore, type Snip } from '$lib/stores/snip'
import { playbackObserver } from '$lib/observers/playback'

// Refactored services
import { TrackStateManager } from '$lib/services/track-state-manager'
import { PlaybackController } from '$lib/services/playback-controller'
import { TrackNotificationService } from '$lib/services/track-notification-service'

/**
 * Refactored TrackObserver using composition over inheritance
 * Delegates responsibilities to focused service classes
 */
export class TrackObserver {
    private trackStateManager: TrackStateManager
    private playbackController: PlaybackController
    private notificationService: TrackNotificationService
    private boundProcessTimeUpdate: (event: CustomEvent) => void
    private boundProcessMediaPlayInit: (event: CustomEvent) => void
    private processTimeoutId: NodeJS.Timeout | null = null
    private muteTimeoutId: NodeJS.Timeout | null = null

    constructor() {
        // Inject dependencies for better testability
        this.trackStateManager = new TrackStateManager()
        this.playbackController = new PlaybackController()
        this.notificationService = new TrackNotificationService()
        this.boundProcessTimeUpdate = this.processTimeUpdate.bind(this)
        this.boundProcessMediaPlayInit = this.processMediaPlayInit.bind(this)
    }

    async initialize() {
        playbackObserver.updateChorusUI()
        await this.processSongTransition()
        document.addEventListener(
            'FROM_MEDIA_TIMEUPDATE',
            this.boundProcessTimeUpdate as EventListener
        )
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

    private isAtSnipEnd(currentTimeMS: number): boolean {
        return this.trackStateManager.isTrackAtSnipEnd(currentTimeMS, this.currentSong)
    }

    updateCurrentTime(time: number): void {
        this.playbackController.updateCurrentTime(time)
    }

    skipTrack(): void {
        this.playbackController.skipTrack()
    }

    async processSongTransition() {
        const songInfo = this.currentSong

        if (this.playbackController.shouldSkipTrack(songInfo)) {
            return this.skipTrack()
        }

        if (songInfo?.snip) {
            this.playbackController.setSeeking(true)
            this.playbackController.mute()
        }

        // Clear any pending unmute timeout to prevent accumulation
        if (this.muteTimeoutId) {
            clearTimeout(this.muteTimeoutId)
        }

        this.muteTimeoutId = setTimeout(() => {
            this.playbackController.unMute()
            this.playbackController.setSeeking(false)
            this.muteTimeoutId = null
        }, 50)

        await this.trackStateManager.setPlayback()
        await this.updateTrackType()
        await this.notificationService.showTrackChangeNotification(songInfo)
    }

    // Notification handling is now delegated to TrackNotificationService

    private async processTimeUpdate(event: CustomEvent) {
        // Cancel previous timeout to prevent accumulation
        if (this.processTimeoutId) {
            clearTimeout(this.processTimeoutId)
        }

        // Only ONE timeout active at a time
        this.processTimeoutId = setTimeout(async () => {
            const currentSong = this.currentSong

            if (!currentSong || !this.playbackController.isControlEnabled) return

            const currentTimeMS = event.detail.currentTime * 1000
            const snip = this.snip

            // Check if track should be skipped
            if (this.playbackController.shouldSkipTrack(currentSong)) {
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

            // Early return if not at snip end
            if (currentSong.snip && !this.isAtSnipEnd(currentTimeMS)) return

            // Handle looping
            if (this.loop.looping && this.isAtSnipEnd(currentTimeMS)) {
                const loopHandled = await this.playbackController.handleLooping(currentTimeMS)
                if (loopHandled) return
            }

            // Handle shared snip URL cleanup
            if (snip?.is_shared && location?.search) {
                history.pushState(null, '', location.pathname)
            }

            // Handle track end or snip end
            const atSnipEnd = currentSong.snip && currentTimeMS >= currentSong.snip.end_time * 1000
            const shouldSkip =
                (currentSong.snip || currentSong.blocked) &&
                (currentTimeMS >= currentSong.duration * 1000 || atSnipEnd)

            if (shouldSkip) {
                this.skipTrack()
            }

            this.processTimeoutId = null
        }, 50)
    }

    async disconnect() {
        document.removeEventListener(
            'FROM_MEDIA_TIMEUPDATE',
            this.boundProcessTimeUpdate as EventListener
        )
        document.removeEventListener(
            'FROM_MEDIA_PLAY_INIT',
            this.boundProcessMediaPlayInit as EventListener
        )

        // Clear any pending timeouts to prevent accumulation
        if (this.processTimeoutId) {
            clearTimeout(this.processTimeoutId)
            this.processTimeoutId = null
        }
        if (this.muteTimeoutId) {
            clearTimeout(this.muteTimeoutId)
            this.muteTimeoutId = null
        }

        // Clean up services
        this.notificationService.cleanup()

        const media = get(mediaStore)
        if (media.active) await mediaStore.setActive(false)
    }
}

export const trackObserver = new TrackObserver()
