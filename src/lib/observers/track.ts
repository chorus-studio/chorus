import { get } from 'svelte/store'
import { loopStore } from '$lib/stores/loop'
import { playback } from '$lib/utils/playback'
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

    atTempSnipEnd({ currentTimeMS, snip }: { currentTimeMS: number; snip: Snip }) {
        const { end_time } = snip
        const endTimeMS = end_time * 1000 - 100
        const loopEndTimeMS = endTimeMS + 3000
        return currentTimeMS > Math.min(loopEndTimeMS, end_time * 1000)
    }

    atSnipEnd({ currentTimeMS, track }: { currentTimeMS: number; track: SimpleTrack }) {
        const { end_time } = track
        const atSongEnd = end_time == playback.duration()!
        const endTimeMS = end_time * 1000 - (atSongEnd ? 100 : 0)
        return currentTimeMS >= endTimeMS
    }

    updateCurrentTime(time: number) {
        document.dispatchEvent(
            new CustomEvent('FROM_CHORUS_EXTENSION', {
                detail: { type: 'current_time', data: { value: time } }
            })
        )
    }

    skipTrack() {
        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        ) as HTMLButtonElement
        nextButton?.click()
    }

    async processSongTransition() {
        const songInfo = this.currentSong

        if (songInfo?.blocked) {
            this.mute()
            return this.skipTrack()
        } else if (songInfo?.snipped) {
            this.seeking = true
            this.mute()
            const { start_time } = songInfo
            const startTimeMS = start_time * 1000
            await this.playerService.seekTrackToPosition(startTimeMS)
            this.seeking = false
        }

        if (this.isMute) this.unMute()
    }

    private processTimeUpdate(event: CustomEvent) {
        const currentSong = this.currentSong

        if (!currentSong || this.seeking) return

        setTimeout(async () => {
            const currentTimeMS = event.detail.currentTime * 1000
            const currentSong = this.currentSong
            const snip = this.snip

            if (this.snip && this.atTempSnipEnd({ currentTimeMS, snip: this.snip })) {
                const start_time = this.snip.start_time
                return this.updateCurrentTime(start_time)
            }

            if (currentSong.snipped && !this.atSnipEnd({ currentTimeMS, track: currentSong }))
                return

            if (this.loop.looping && this.atSnipEnd({ currentTimeMS, track: currentSong })) {
                if (this.loop.type === 'amount') await loopStore.decrement()
                return this.updateCurrentTime(currentSong.start_time)
            }

            if (snip?.is_shared && location?.search) history.pushState(null, '', location.pathname)
            if (currentSong.snipped || currentSong.blocked) this.skipTrack()
        }, 0)
    }

    disconnect() {
        document.removeEventListener(
            'FROM_MEDIA_TIMEUPDATE',
            this.boundProcessTimeUpdate as EventListener
        )
    }
}

export const trackObserver = new TrackObserver()
