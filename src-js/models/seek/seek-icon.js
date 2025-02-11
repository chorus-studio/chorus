import { createSeekIcon } from '../../components/seek/seek-icon.js'

import { currentData } from '../../data/current.js'
import { songState } from '../../data/song-state.js'
import { parseNodeString } from '../../utils/parser.js'
import { spotifyVideo } from '../../actions/overload.js'
import { playback } from '../../utils/playback.js'
import { secondsToTime } from '../../utils/time.js'

export default class SeekIcons {
    constructor() {
        this._data = null
        this._video = spotifyVideo.element
    }

    async init() {
        this.#removeCurrentSpotifySeekIcons()
        this.#placeIcons()
        await this.setSeekLabels()
        this.#setupListeners()
    }

    async #setData() {
        this._data = await currentData.getSeekValues()
        return this._data
    }

    get #seekType() {
        const anchor = document.querySelector('[data-testid="context-item-info-title"] > span > a')
        // album, track, episode, chapter
        const contextType = anchor?.getAttribute('href')?.split('/')?.at(1)

        return ['track', 'album'].includes(contextType) ? 'global' : 'shows'
    }

    get rwIcon() {
        return createSeekIcon('rw')
    }

    get ffIcon() {
        return createSeekIcon('ff')
    }

    get #spotifySeekIcons() {
        const spotifyRWIcon = document.querySelector('[data-testid="control-button-seek-back-15"]')
        const spotifyFFIcon = document.querySelector(
            '[data-testid="control-button-seek-forward-15"]'
        )
        return { spotifyFFIcon, spotifyRWIcon }
    }

    removeIcons() {
        const seekBack = document.getElementById('seek-player-rw-button')
        const seekForward = document.getElementById('seek-player-ff-button')
        if (!seekBack) return

        seekBack.style.display = 'none'
        seekForward.style.display = 'none'

        const { spotifyRWIcon, spotifyFFIcon } = this.#spotifySeekIcons
        if (!spotifyRWIcon) return

        spotifyRWIcon.style.display = 'flex'
        spotifyFFIcon.style.display = 'flex'
    }

    #placeIcons() {
        const rwIconButton = document.getElementById('seek-player-rw-button')
        const ffIconButton = document.getElementById('seek-player-ff-button')

        if (rwIconButton) {
            rwIconButton.style.display = 'flex'
            ffIconButton.style.display = 'flex'
            return
        }

        const skipForward = document.querySelector('[data-testid="control-button-skip-forward"]')
        const skipBack = document.querySelector('[data-testid="control-button-skip-back"]')

        const ffIcon = parseNodeString(this.ffIcon)
        const rwIcon = parseNodeString(this.rwIcon)

        if (this.#seekType == 'shows') this.#removeCurrentSpotifySeekIcons()

        skipForward.parentElement.insertBefore(ffIcon, skipForward.nextSibling)
        skipBack.parentElement.insertBefore(rwIcon, skipBack)
    }

    #resetRWIcon() {
        const skipBack = document.querySelector('[data-testid="control-button-skip-back"]')
        const rwIcon = document.getElementById('seek-player-rw-button')
        skipBack.parentElement.insertBefore(rwIcon, skipBack)
    }

    async setSeekLabels() {
        const data = await this.#setData()

        this.#removeCurrentSpotifySeekIcons()
        this.#resetRWIcon()

        const rwIconLabel = document.getElementById('seek-icon-rw-label')
        const ffIconLabel = document.getElementById('seek-icon-ff-label')

        const { rw, ff } = data[this.#seekType]

        rwIconLabel.textContent = rw
        ffIconLabel.textContent = ff

        const rwButton = rwIconLabel.parentElement
        const ffButton = ffIconLabel.parentElement

        rwButton.setAttribute('aria-label', `Rewind ${rw}s`)
        ffButton.setAttribute('aria-label', `Fast-Forward ${ff}s`)
    }

    #removeCurrentSpotifySeekIcons() {
        if (this.#seekType == 'global') return

        const { spotifyFFIcon, spotifyRWIcon } = this.#spotifySeekIcons

        if (spotifyFFIcon?.style?.display == 'none') return
        if (!spotifyRWIcon && !spotifyFFIcon) return

        spotifyRWIcon.style.display = 'none'
        spotifyFFIcon.style.display = 'none'
    }

    async #calculateCurrentTime({ role, seekTime }) {
        const { startTime = 0, endTime = playback.duration() } = await songState()
        let currentTime = parseInt(this._video.currentTime, 10)
        if (currentTime !== playback.current()) currentTime = playback.current()

        const newTimeFF = Math.min(
            parseInt(currentTime + seekTime, 10),
            parseInt(endTime, 10) - 0.5
        )
        const newStartTime = currentTime < parseInt(startTime) ? 0 : startTime
        const newTimeRW = Math.max(
            parseInt(currentTime - seekTime, 10),
            parseInt(newStartTime, 10),
            0
        )

        return role == 'ff' ? newTimeFF : newTimeRW
    }

    async #handleSeekButton(e) {
        const button = e.target
        const role = button.getAttribute('role')
        const seekTime = parseInt(button.firstElementChild.textContent, 10)

        const newTime = await this.#calculateCurrentTime({ role, seekTime })
        this._video.currentTime = newTime
        const position = document.querySelector('[data-testid="playback-position"]')
        position.textContent = secondsToTime(newTime)
    }

    #setupListeners() {
        const rwIconButton = document.getElementById('seek-player-rw-button')
        const ffIconButton = document.getElementById('seek-player-ff-button')

        rwIconButton.onclick = (e) => this.#handleSeekButton(e)
        ffIconButton.onclick = (e) => this.#handleSeekButton(e)
    }
}
