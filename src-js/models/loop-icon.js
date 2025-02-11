import { store } from '../stores/data.js'
import { currentData } from '../data/current.js'
import { spotifyVideo } from '../actions/overload.js'

import { playback } from '../utils/playback.js'
import { parseNodeString } from '../utils/parser.js'
import { highlightIcon } from '../utils/highlight.js'

export default class LoopIcon {
    constructor(songTracker) {
        this._songTracker = songTracker
        this._video = spotifyVideo.element
    }

    init() {
        this.#placeIcon()
        this.#setupListeners()
    }

    get #autoLoopUI() {
        return `
            <button
                role="loop"
                id="loop-button"
                class="chorus-hover-white"
                aria-label="Loop Snip/Track"
                style="display:flex;justify-content:center;align-items:center;border:none;background:none;"
            >
                <svg 
                    id="loop-icon"
                    width="1.25rem"
                    height="1.25rem"
                    fill="currentColor"
                    stroke="currentColor"
                    viewBox="0 0 32 32"
                    stroke-width="0.2"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <path xmlns="http://www.w3.org/2000/svg" d="m16 28.0063c-4.6831 0-8.49375-3.8075-8.5-8.4894-.005-.4138.02437-5.6125 4.245-9.91878.3962-.40437.8162-.78749 1.2575-1.14874-2.55-.96375-5.92312-1.44938-9.5025-1.44938-.82812 0-1.5-.67188-1.5-1.5s.67188-1.5 1.5-1.5c4.8675 0 9.2506.83875 12.5106 2.50062 3.2563-1.65375 7.6325-2.48812 12.4894-2.48812.8281 0 1.5.67188 1.5 1.5 0 .82813-.6719 1.5-1.5 1.5-3.5712 0-6.9388.48312-9.485 1.44187.4337.35563.8456.73188 1.2356 1.13 4.2219 4.30563 4.2544 9.50443 4.25 9.92003v.0025c-.0006 4.6862-3.8137 8.4994-8.5006 8.4994zm.0081-18.04255c-.7818.51185-1.4887 1.08995-2.12 1.73435-3.4331 3.5025-3.3887 7.7356-3.3881 7.7781v.0301c0 3.0325 2.4675 5.5 5.5 5.5s5.5-2.4675 5.5-5.5v-.0388c0-.1538-.0406-4.3962-3.43-7.8219-.6163-.6231-1.3037-1.1837-2.0619-1.68185z"/>
                </svg>
            </button>
        `
    }

    get #loopButton() {
        return document.getElementById('loop-button')
    }

    #placeIcon() {
        const skipForwardButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        )
        const loopButton = parseNodeString(this.#autoLoopUI)
        skipForwardButton?.parentElement?.appendChild(loopButton)
    }

    updateIconPosition() {
        const skipForwardButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        )
        const parentElement = skipForwardButton?.parentElement
        parentElement?.insertBefore(this.#loopButton, parentElement.lastElementChild.nextSibling)
    }

    get #isHighlighted() {
        const svgIcon = document.getElementById('loop-icon')
        if (!svgIcon) return false

        return svgIcon.getAttribute('fill') == '#1ed760'
    }

    highlightLoop({ isSnip, autoLoop = false }) {
        if (!isSnip && autoLoop) {
            this._video.element.setAttribute('startTime', 0)
            this._video.element.setAttribute('endTime', playback.duration())
        }

        if (!isSnip && !autoLoop) {
            this._video.resetTempTimes()
        }

        this.#loopButton.setAttribute(
            'aria-label',
            autoLoop ? 'Remove Loop' : `Loop ${isSnip ? 'Snip' : 'Track'}`
        )
        highlightIcon({ highlight: autoLoop, selector: '#loop-icon' })
    }

    removeIcon() {
        this.#loopButton?.remove()
    }

    async #handleLoopButton() {
        const track = await currentData.readTrack()
        const autoLoop = track.isSnip ? !track?.autoLoop : !this.#isHighlighted
        this.highlightLoop({ isSnip: track.isSnip, autoLoop })

        if (!track.isSnip) return

        const updatedTrack = await store.saveTrack({ id: track.id, value: { ...track, autoLoop } })
        await this._songTracker.updateCurrentSongData(updatedTrack)
    }

    #setupListeners() {
        this.#loopButton.onclick = async () => await this.#handleLoopButton()
    }
}
