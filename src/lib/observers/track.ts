import { get } from 'svelte/store'
import { loopStore } from '$lib/stores/loop'
import { queue } from '$lib/observers/queue'
import { seekStore } from '$lib/stores/seek'
import { mediaStore } from '$lib/stores/media'
import { configStore } from '$lib/stores/config'
import { volumeStore } from '$lib/stores/volume'
import { effectsStore } from '$lib/stores/effects'
import { licenseStore } from '$lib/stores/license'
import { settingsStore } from '$lib/stores/settings'
import { playbackStore } from '$lib/stores/playback'
import { snipStore, type Snip } from '$lib/stores/snip'
import type { SimpleTrack } from '$lib/stores/data/cache'
import { playbackObserver } from '$lib/observers/playback'
import { nowPlaying, type NowPlaying } from '$lib/stores/now-playing'
import { getNotificationService, type NotificationService } from '$lib/utils/notifications'

export class TrackObserver {
    private seeking: boolean = false
    private currentTrackId: string | null = null
    private notificationService: NotificationService
    private songChangeTimeout: NodeJS.Timeout | null = null
    private boundProcessTimeUpdate: (event: CustomEvent) => void
    private boundProcessMediaPlayInit: (event: CustomEvent) => void

    constructor() {
        this.notificationService = getNotificationService()
        this.boundProcessTimeUpdate = this.processTimeUpdate.bind(this)
        this.boundProcessMediaPlayInit = this.processMediaPlayInit.bind(this)
    }

    async initialize() {
        playbackObserver.updateChorusUI()
        await this.processSongTransition()
        await queue.refreshQueue()
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
        await this.updateTrackType()
        this.setPlayback()
        this.setEffect()
    }

    get audioPreset() {
        return this.config.audio_presets.find((p) => p.active)
    }

    setEffect() {
        if (!this.isSupporter || !this.audioPreset) return effectsStore.dispatchEffect()

        configStore.updateAudioPreset({ preset: this.audioPreset, type: 'effect' })
    }

    setPlayback() {
        if (!this.isSupporter || !this.audioPreset) {
            const playback = this.currentSong?.playback ?? this.playback.default
            if (playback) playbackStore.dispatchPlaybackSettings()
            return
        }

        configStore.updateAudioPreset({ preset: this.audioPreset, type: 'playback' })
    }

    get currentSong() {
        return get(nowPlaying)
    }

    get playback() {
        return get(playbackStore)
    }

    get config() {
        return get(configStore)
    }

    get snip() {
        return get(snipStore)
    }

    get loop() {
        return get(loopStore)
    }

    get seek() {
        return get(seekStore)
    }

    get volume() {
        return get(volumeStore)
    }

    get settings() {
        return get(settingsStore)
    }

    get isSupporter() {
        return get(licenseStore).status === 'granted'
    }

    get muteButton() {
        return document.querySelector(
            '[data-testid="volume-bar-toggle-mute-button"]'
        ) as HTMLButtonElement
    }

    mute() {
        volumeStore.mute()
    }

    unMute() {
        if (this.volume.muted) volumeStore.unMute()
    }

    atTempSnipEnd(currentTimeMS: number) {
        const { end_time, last_updated } = this.snip as Snip
        if (!end_time || !last_updated) return false

        const endTimeMS = end_time * 1000 - 100
        const lastUpdateSet = !!last_updated
        const loopEndTimeMS =
            !lastUpdateSet || last_updated == 'start' ? endTimeMS : endTimeMS + 3000
        return (
            !Number.isNaN(endTimeMS) &&
            currentTimeMS > Math.min(loopEndTimeMS, this.currentSong.duration * 1000)
        )
    }

    async updateTrackType() {
        const anchor = document.querySelector('[data-testid="context-item-info-title"] > span > a')
        // album, track, episode, chapter
        const contextType = anchor?.getAttribute('href')?.split('/')?.at(1)
        if (!contextType) return

        const type = ['track', 'album'].includes(contextType) ? 'default' : 'long_form'
        if (this.seek.media_type !== type) {
            playbackObserver.updateChorusUI()
            await seekStore.updateMediaType(type)
        }
    }

    atSnipEnd({ currentTimeMS, track }: { currentTimeMS: number; track: SimpleTrack }) {
        const { end_time = this.currentSong.duration } = track?.snip ?? {}
        const atSongEnd = end_time == this.currentSong.duration
        const endTimeMS = end_time * 1000 - (atSongEnd ? 100 : 0)
        return currentTimeMS >= endTimeMS
    }

    updateCurrentTime(time: number) {
        window.postMessage({ type: 'FROM_CURRENT_TIME_LISTENER', data: time }, '*')
    }

    skipTrack() {
        if (!this.volume.muted) this.mute()
        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        ) as HTMLButtonElement
        nextButton?.click()
    }

    async processSongTransition() {
        const songInfo = this.currentSong

        if (
            songInfo?.blocked ||
            configStore.checkIfTrackShouldBeSkipped({
                title: songInfo?.title ?? '',
                artist: songInfo?.artist ?? ''
            })
        )
            return this.skipTrack()

        if (songInfo?.snip) {
            this.seeking = true
            this.mute()
        }

        setTimeout(() => {
            this.unMute()
            this.seeking = false
        }, 50)
        this.setPlayback()
        await queue.refreshQueue()
        await this.updateTrackType()
        await this.showNotification(songInfo)
    }

    private async showNotification(songInfo: NowPlaying) {
        if (this.songChangeTimeout) clearTimeout(this.songChangeTimeout)

        if (this.settings.notifications.enabled && this.settings.notifications.on_track_change) {
            this.songChangeTimeout = setTimeout(async () => {
                if (!this.currentTrackId || songInfo.id !== this.currentTrackId) {
                    await this.notificationService.showNotification(songInfo)
                    this.currentTrackId = songInfo.id
                }
            }, 5_000)
        }
    }

    private async processTimeUpdate(event: CustomEvent) {
        setTimeout(async () => {
            const currentSong = this.currentSong

            if (!currentSong || this.seeking) return

            const currentTimeMS = event.detail.currentTime * 1000
            const snip = this.snip

            const skipTrack = configStore.checkIfTrackShouldBeSkipped({
                title: currentSong.title ?? '',
                artist: currentSong.artist ?? ''
            })

            if (skipTrack) return this.skipTrack()

            if (currentSong.snip && currentTimeMS < currentSong.snip.start_time * 1000) {
                return this.updateCurrentTime(currentSong.snip.start_time)
            }

            if (this.snip && this.atTempSnipEnd(currentTimeMS)) {
                return this.updateCurrentTime(this.snip.start_time)
            }

            if (currentSong.snip && !this.atSnipEnd({ currentTimeMS, track: currentSong })) return

            if (this.loop.looping && this.atSnipEnd({ currentTimeMS, track: currentSong })) {
                if (this.loop.type === 'amount') await loopStore.decrement()
                return this.updateCurrentTime(currentSong.snip?.start_time ?? 0)
            }

            const atSnipEnd = currentSong.snip && currentTimeMS >= currentSong.snip.end_time * 1000

            if (snip?.is_shared && location?.search) history.pushState(null, '', location.pathname)
            if (
                (currentSong.snip || currentSong.blocked) &&
                (currentTimeMS >= this.currentSong.duration * 1000 || atSnipEnd)
            )
                this.skipTrack()
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
        const media = get(mediaStore)
        if (media.active) await mediaStore.setActive(false)
    }
}

export const trackObserver = new TrackObserver()
