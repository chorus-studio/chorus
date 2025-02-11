import { SVG_PATHS } from './ui.js'
import { parseNodeString } from '../utils/parser.js'

class ExtControls {
    constructor() {
        this._port = null
        this._colours = {}
        this._eventsSet = false
    }

    initialize(port) {
        this._port = port
        this.setupEvents()
    }

    setupEvents() {
        if (this._eventsSet) return

        Object.values(this.btns).forEach((btn) => {
            btn.onclick = () => {
                this._port?.postMessage({ type: 'controls', key: btn.getAttribute('role') })
            }
            btn.onmouseover = () => {
                btn.style.scale = 1.125
            }
            btn.onmouseout = () => {
                btn.style.scale = 1
            }
        })

        this._eventsSet = true
    }

    updateControlsState(active) {
        document.body.style.height = active ? '124px' : '88px'

        const mediaContainer = document.getElementById('media-controls')
        mediaContainer.style.display = active ? 'flex' : 'none'
    }

    #setColours({ textColour, backgroundColour }) {
        if (textColour) this._colours.textColour = textColour
        if (backgroundColour) this._colours.backgroundColour = backgroundColour
    }

    setFill({ textColour, backgroundColour }) {
        this.#setColours({ textColour, backgroundColour })
        const { playBtn } = this.btns
        const { rwSpan, ffSpan } = this.spans
        const {
            loopIcon,
            playIcon,
            heartIcon,
            repeatIcon,
            shuffleIcon,
            blockIcon,
            nextIcon,
            previousIcon,
            rwIcon,
            ffIcon
        } = this.icons

        playBtn.style.backgroundColor = textColour
        playIcon.style.fill = backgroundColour
        playIcon.style.stroke = backgroundColour

        shuffleIcon.style.stroke = textColour
        shuffleIcon.style.fill = textColour

        blockIcon.style.stroke = textColour
        blockIcon.style.fill = textColour
        blockIcon.style.strokeWidth = 0.8

        loopIcon.style.stroke = textColour
        loopIcon.style.fill = textColour
        loopIcon.style.strokeWidth = 0.2

        heartIcon.style.stroke = textColour
        heartIcon.style.strokeWidth = 2

        previousIcon.style.fill = textColour
        previousIcon.style.stroke = textColour

        nextIcon.style.fill = textColour
        nextIcon.style.stroke = textColour

        repeatIcon.style.fill = textColour
        repeatIcon.style.stroke = textColour
        repeatIcon.style.strokeWidth = 0.5

        rwIcon.style.stroke = textColour
        rwIcon.style.strokeWidth = 7
        rwSpan.style.color = textColour

        ffIcon.style.stroke = textColour
        ffIcon.style.strokeWidth = 7
        ffSpan.style.color = textColour
    }

    get spans() {
        return {
            rwSpan: document.getElementById('seek-rw'),
            ffSpan: document.getElementById('seek-ff')
        }
    }

    #getPathKey({ type, key, result }) {
        if (key == 'play/pause')
            return type == 'state' ? result : result == 'play' ? 'pause' : 'play'

        if (type == 'controls') return result?.includes('one') ? 'repeat1' : 'repeat'
        return result?.includes('disable') ? 'repeat1' : 'repeat'
    }

    #updateHeart({ svg, state }) {
        const hearted = state?.includes('remove')
        svg.style.fill = hearted ? this._colours.textColour : 'none'
    }

    #updateShuffle({ type, key, svg, state }) {
        const { textColour } = this._colours
        svg.style.stroke = textColour
        svg.style.fill = textColour

        const span = document.getElementById(`${key}-dot`)
        const enabled = type == 'state' ? state?.includes('disable') : state?.includes('enable')
        this.#updateSpan({ span, enabled, textColour })
    }

    #updateSpan({ span, enabled, textColour }) {
        span.style.display = enabled ? 'inline' : 'none'
        span.style.color = textColour
    }

    #updateRepeat({ type, key, svg, state }) {
        const { textColour } = this._colours
        svg.style.stroke = textColour
        svg.style.fill = textColour

        const span = document.getElementById(`${key}-dot`)
        const enabled =
            type == 'state' ? state?.search(/(one)|(disable)/g) >= 0 : state?.includes('enable')
        this.#updateSpan({ span, enabled, textColour })
    }

    #updateSeek({ key, state }) {
        const isRewind = key.endsWith('rewind')
        const span = isRewind ? this.spans.rwSpan : this.spans.ffSpan
        const seekValue = state?.split(' ')?.at(-1) ?? 10
        span.textContent = parseInt(seekValue, 10)
    }

    #updateLoop({ key, svg, state }) {
        const { textColour } = this._colours
        svg.style.stroke = textColour
        svg.style.fill = textColour

        const span = document.getElementById(`${key}-dot`)
        const enabled = state?.includes('remove')
        this.#updateSpan({ span, enabled, textColour })
    }

    updateIcons({ type, key, result }) {
        const btn = document.querySelector(`[role="${key}"]`)
        const svg = btn.lastElementChild

        if (key.startsWith('seek')) return this.#updateSeek({ key, state: result })
        if (key == 'save/unsave') return this.#updateHeart({ svg, state: result })
        if (key == 'shuffle') return this.#updateShuffle({ type, key, svg, state: result })
        if (key == 'loop') return this.#updateLoop({ key, svg, state: result })

        if (['repeat', 'play/pause'].includes(key)) {
            const pathKey = this.#getPathKey({ type, key, result })
            const newPath = parseNodeString(
                `<svg xmlns="http://www.w3.org/2000/svg">${SVG_PATHS[pathKey]}</svg>`
            )
            svg.replaceChildren(...newPath.childNodes)
        }

        if (key == 'repeat') return this.#updateRepeat({ type, key, svg, state: result })

        const { textColour, backgroundColour } = this._colours
        svg.style.fill = key == 'play/pause' ? backgroundColour : textColour
        key != 'play/pause' && (svg.style.stroke = textColour)
    }

    updateUIState({ type, data }) {
        data.forEach(({ key, data }) => this.updateIcons({ type, key, result: data }))
    }

    get btns() {
        return {
            ffBtn: document.getElementById('ff-btn'),
            rwBtn: document.getElementById('rw-btn'),
            nextBtn: document.getElementById('next-btn'),
            playBtn: document.getElementById('play-btn'),
            loopBtn: document.getElementById('loop-btn'),
            heartBtn: document.getElementById('heart-btn'),
            blockBtn: document.getElementById('block-btn'),
            repeatBtn: document.getElementById('repeat-btn'),
            shuffleBtn: document.getElementById('shuffle-btn'),
            previousBtn: document.getElementById('previous-btn')
        }
    }

    get icons() {
        return {
            ffIcon: document.getElementById('ff-icon'),
            rwIcon: document.getElementById('rw-icon'),
            playIcon: document.getElementById('play-icon'),
            nextIcon: document.getElementById('next-icon'),
            loopIcon: document.getElementById('loop-icon'),
            heartIcon: document.getElementById('heart-icon'),
            blockIcon: document.getElementById('block-icon'),
            repeatIcon: document.getElementById('repeat-icon'),
            shuffleIcon: document.getElementById('shuffle-icon'),
            previousIcon: document.getElementById('previous-icon')
        }
    }
}

export const extControls = new ExtControls()
