import { get } from 'svelte/store'
import { loopStore } from '$lib/stores/loop'
import { queue } from '$lib/observers/queue'
import { nowPlaying } from '$lib/stores/now-playing'
import { snipStore, type Snip } from '$lib/stores/snip'
import type { SimpleTrack } from '$lib/stores/data/cache'
import { getPlayerService, type PlayerService } from '$lib/api/services/player'

export class TrackObserver {
    private seeking: boolean = false
    private playerService: PlayerService
    private boundProcessTimeUpdate: (event: CustomEvent) => void

    constructor() {
        this.playerService = getPlayerService()
        this.boundProcessTimeUpdate = this.processTimeUpdate.bind(this)
    }

    async initialize() {
        await this.processSongTransition()
        await queue.refreshQueue()
        document.addEventListener(
            'FROM_MEDIA_TIMEUPDATE',
            this.boundProcessTimeUpdate as EventListener
        )
    }

    get currentSong() {
        return get(nowPlaying)
    }

    get snip() {
        return get(snipStore)
    }

    get loop() {
        return get(loopStore)
    }

    get muteButton() {
        return document.querySelector(
            '[data-testid="volume-bar-toggle-mute-button"]'
        ) as HTMLButtonElement
    }

    get isMute() {
        return this.muteButton?.getAttribute('aria-label') == 'Unmute'
    }

    mute() {
        if (!this.isMute) this.muteButton?.click()
    }

    unMute() {
        if (this.isMute) this.muteButton?.click()
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

    atSnipEnd({ currentTimeMS, track }: { currentTimeMS: number; track: SimpleTrack }) {
        const { end_time } = track
        const atSongEnd = end_time == this.currentSong.duration
        const endTimeMS = end_time * 1000 - (atSongEnd ? 100 : 0)
        return currentTimeMS >= endTimeMS
    }

    updateCurrentTime(time: number) {
        document.dispatchEvent(new CustomEvent('FROM_CURRENT_TIME_LISTENER', { detail: time }))
    }

    skipTrack() {
        if (!this.isMute) this.mute()
        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        ) as HTMLButtonElement
        nextButton?.click()
    }

    async processSongTransition() {
        const songInfo = this.currentSong

        if (songInfo?.blocked) return this.skipTrack()
        if (songInfo?.snipped) {
            this.seeking = true
            this.mute()
            const { start_time } = songInfo
            const startTimeMS = start_time * 1000
            await this.playerService.seekTrackToPosition(startTimeMS)
            this.seeking = false
        }

        if (this.isMute) this.unMute()
        await queue.refreshQueue()
    }

    private async processTimeUpdate(event: CustomEvent) {
        const currentSong = this.currentSong

        if (!currentSong || this.seeking) return

        const currentTimeMS = event.detail.currentTime * 1000
        const snip = this.snip

        if (this.snip && this.atTempSnipEnd(currentTimeMS)) {
            return this.updateCurrentTime(this.snip.start_time)
        }

        if (currentSong.snipped && !this.atSnipEnd({ currentTimeMS, track: currentSong })) return

        if (this.loop.looping && this.atSnipEnd({ currentTimeMS, track: currentSong })) {
            if (this.loop.type === 'amount') await loopStore.decrement()
            return this.updateCurrentTime(currentSong.start_time)
        }

        if (snip?.is_shared && location?.search) history.pushState(null, '', location.pathname)
        if (
            currentSong.snipped ||
            currentSong.blocked ||
            currentTimeMS >= this.currentSong.duration * 1000
        )
            this.skipTrack()
    }

    disconnect() {
        document.removeEventListener(
            'FROM_MEDIA_TIMEUPDATE',
            this.boundProcessTimeUpdate as EventListener
        )
    }
}

export const trackObserver = new TrackObserver()
