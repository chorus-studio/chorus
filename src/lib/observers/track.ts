import { get } from 'svelte/store'
import { dataStore } from '$lib/stores/data'
import { nowPlaying, type NowPlaying } from '$lib/stores/now-playing'
import { snipStore, type Snip } from '$lib/stores/snip'
import { playback } from '$lib/utils/playback'
import type { SimpleTrack } from '$lib/stores/data/cache'
import { currentSongInfo } from '$lib/utils/song'
import { getPlayerService, type PlayerService } from '$lib/api/services/player'

export class TrackObserver {
    private seeking: boolean = false
    private timer: NodeJS.Timeout | null = null
    private playerService: PlayerService

    constructor() {
        this.playerService = getPlayerService()
    }

    async initialize() {
        await this.processSongTransition()
    }

    get currentSong() {
        return get(nowPlaying)
    }

    get snip() {
        return get(snipStore)
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
        return currentTimeMS >= Math.min(loopEndTimeMS, end_time * 1000)
    }

    atSnipEnd({ currentTimeMS, track }: { currentTimeMS: number; track: SimpleTrack }) {
        const { end_time } = track
        const atSongEnd = end_time === playback.duration()
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
            this.mute()
            const { start_time } = songInfo
            const startTimeMS = start_time * 1000
            const currentTimeMS = (this.currentSong?.current ?? 0) * 1000
            this.seeking = true
            await this.playerService.seekTrackToPosition(startTimeMS)
            this.seeking = false
        }

        if (this.isMute) this.unMute()
    }

    process() {
        if (!this.currentSong) return

        this.timer = setTimeout(() => {
            const currentSong = this.currentSong
            const snip = this.snip

            if (!currentSong || this.seeking) return

            const currentTimeMS = currentSong.current * 1000

            if (snip && this.atTempSnipEnd({ currentTimeMS, snip })) {
                return this.updateCurrentTime(snip.start_time)
            }

            if (currentSong.snipped && !this.atSnipEnd({ currentTimeMS, track: currentSong }))
                return

            if (currentSong.loop && snip?.is_shared && currentSong.current >= snip.end_time) {
                return this.updateCurrentTime(snip.start_time)
            }

            if (snip?.is_shared && location?.search) history.pushState(null, '', location.pathname)
            if (currentSong.snipped || currentSong.blocked) this.skipTrack()
        }, 100)
    }

    disconnect() {
        if (this.timer) clearTimeout(this.timer)
        this.timer = null
    }
}

export const trackObserver = new TrackObserver()
