import { currentData } from '../data/current.js'
import { songState } from '../data/song-state.js'
import { spotifyVideo } from '../actions/overload.js'

import { playback } from '../utils/playback.js'
import { timeToSeconds } from '../utils/time.js'
import { currentSongInfo } from '../utils/song.js'
import { highlightElement } from '../utils/highlight.js'

import Dispatcher from '../events/dispatcher.js'

export default class SongTracker {
    constructor() {
        this._init = true
        this._eqSet = false
        this._reverbSet = false
        this._currentSongState = null
        this._video = spotifyVideo.element
        this._dispatcher = new Dispatcher()
    }

    async init() {
        this.#setupListeners()
        const songStateData = await this.#setCurrentSongData()
        songStateData.isShared
            ? await this.handleShared(songStateData)
            : await this.songChange(songStateData)
    }

    async #dispatchPlaySharedSong({ track_id, position }) {
        await this._dispatcher.sendEvent({
            eventType: 'play.shared',
            detail: { key: 'play.shared', values: { track_id, position } }
        })
    }

    async #dispatchSeekToPosition(position) {
        await this._dispatcher.sendEvent({
            eventType: 'play.seek',
            detail: { key: 'play.seek', values: { position } }
        })
    }

    async handleShared(songStateData) {
        await this.#applyEffects(songStateData)
        const { startTime: position, trackId } = songStateData
        const track_id = trackId ?? location.pathname?.split('/')?.at(-1)
        this._video.currentTime = position

        this.#mute()
        await this.#dispatchPlaySharedSong({ track_id, position })
        this.#unMute()
    }

    async updateCurrentSongData(values) {
        if (!values) return

        this._currentSongState = { ...(this._currentSongState || {}), ...values }
        await this.#applyEffects(this._currentSongState)
    }

    get #isPlaying() {
        const playButton = document.querySelector('[data-testid="control-button-playpause"]')
        if (!playButton) return false

        return playButton.getAttribute('aria-label') == 'Pause'
    }

    get #muteButton() {
        return document.querySelector('[data-testid="volume-bar-toggle-mute-button"]')
    }

    get #isMute() {
        return this.#muteButton?.getAttribute('aria-label') == 'Unmute'
    }

    #mute() {
        if (!this.#isMute) this.#muteButton?.click()
    }

    #unMute() {
        if (this.#isMute) this.#muteButton?.click()
    }

    get #isFirefox() {
        return navigator.userAgent.includes('Firefox')
    }

    async #setReverb() {
        if (this._reverbSet) return

        const effect = sessionStorage.getItem('reverb') ?? 'none'
        await spotifyVideo.reverb.setReverbEffect(effect)
        this._reverbSet = true
    }

    async #setEQ() {
        if (this._eqSet) return

        const effect = sessionStorage.getItem('equalizer') ?? 'none'
        await spotifyVideo.equalizer.setEQEffect(effect)
        this._eqSet = true
    }

    #setupListeners() {
        this._video.element.addEventListener('timeupdate', this.#handleTimeUpdate)
    }

    clearListeners() {
        this._video.element.removeEventListener('timeupdate', this.#handleTimeUpdate)
        this._reverbSet = false
    }

    async #applyEffects({ isShared, isSnip, playbackRate, preservesPitch }) {
        const { preferredRate, preferredPitch, track } = await currentData.getPlaybackValues()
        this._video.currentSpeed = isShared ? playbackRate : preferredRate
        this._video.playbackRate = this._video.currentSpeed
        this._video.preservesPitch = isShared ? preservesPitch : preferredPitch

        highlightElement({
            selector: '#chorus-icon > svg',
            songStateData: { isSnip, isShared, ...track }
        })
    }

    async #setCurrentSongData() {
        const songStateData = await songState()
        const songInfo = { ...songStateData, ...currentSongInfo() }
        this._currentSongState = songInfo
        return songInfo
    }

    async songChange(initialData = null) {
        const songStateData = initialData ?? (await this.#setCurrentSongData())
        await this.#applyEffects(songStateData)
        const { isSnip, isSkipped, startTime } = songStateData

        if (isSkipped) {
            this.#mute()
            return this.#nextButton.click()
        } else if (isSnip) {
            const parsedStartTime = parseFloat(startTime) * 1000
            const currentPosition = timeToSeconds(this.#playbackPosition?.textContent || '0:00')
            const currentPositionTime = parseFloat(currentPosition) * 1000

            if (parsedStartTime != 0 && currentPositionTime < parsedStartTime) {
                await this.#dispatchSeekToPosition(parsedStartTime)
            }
        }

        if (this.#isMute) this.#unMute()
        this._init = false
    }

    get #nextButton() {
        return document.querySelector('[data-testid="control-button-skip-forward"]')
    }

    get #playbackPosition() {
        return document.querySelector('[data-testid="playback-position"]')
    }

    #handleEditingSnipMode(startTime) {
        const { tempStartTime } = this.#tempVideoAttributes
        this._video.currentTime = parseFloat(tempStartTime ?? startTime)
    }

    get #tempVideoAttributes() {
        return {
            tempEndTime: this._video.element.getAttribute('endTime'),
            tempStartTime: this._video.element.getAttribute('startTime'),
            lastSetThumb: this._video.element.getAttribute('lastSetThumb')
        }
    }

    #atTempSongEnd({ currentTimeMS, endTime }) {
        const { tempStartTime, tempEndTime, lastSetThumb } = this.#tempVideoAttributes
        if (!tempStartTime && !tempEndTime) return false

        const tempEndTimeMS = parseFloat(tempEndTime ?? endTime) * 1000 - 100
        const thumbSet = !!lastSetThumb
        const loopEndTime =
            !thumbSet || lastSetThumb == 'start' ? tempEndTimeMS : tempEndTimeMS + 3000

        return !Number.isNaN(tempEndTimeMS) && currentTimeMS > Math.min(loopEndTime, endTime * 1000)
    }

    #atSnipSongEnd({ currentTimeMS, endTime }) {
        const isSongEnd = endTime == playback.duration()
        const endTimeMS = parseFloat(endTime) * 1000 - (isSongEnd ? 100 : 0)
        return currentTimeMS >= endTimeMS
    }

    #handleTimeUpdate = async () => {
        if (this.#isPlaying && this.#isFirefox) {
            !this._reverbSet && (await this.#setReverb())
            !this._eqSet && (await this.#setEQ())
        }

        if (!this._currentSongState) return

        setTimeout(() => {
            const {
                isShared,
                isSnip,
                isSkipped,
                startTime,
                endTime,
                autoLoop = false
            } = this._currentSongState
            const currentTimeMS = parseFloat(this._video.currentTime * 1000)

            if (this.#atTempSongEnd({ endTime, currentTimeMS }))
                return this.#handleEditingSnipMode(startTime)
            if (isSnip && !this.#atSnipSongEnd({ currentTimeMS, endTime })) return

            if (autoLoop || (isShared && this._video.currentTime >= endTime)) {
                return (this._video.currentTime = startTime)
            }

            if (!isShared && location?.search) history.pushState(null, '', location.pathname)
            if (isSnip || isSkipped) this.#nextButton.click()
        }, 100)
    }
}
