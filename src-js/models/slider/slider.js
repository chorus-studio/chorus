import { spotifyVideo } from '../../actions/overload.js'

import { playback } from '../../utils/playback.js'
import { currentSongInfo } from '../../utils/song.js'
import {
    formatTimeInSeconds,
    secondsToTime,
    timeToMilliseconds,
    timeToSeconds
} from '../../utils/time.js'

export default class Slider {
    constructor() {
        this._isCurrentlyPlaying = true
        this._video = spotifyVideo.element
    }

    init() {
        this.#setUpEvents()
    }

    #setUpEvents() {
        const {
            inputLeft,
            inputRight,
            loopToggleButton,
            thumbLeft,
            thumbRight,
            outputLeft,
            outputRight
        } = this.#elements

        inputLeft.oninput = () => {
            this.updateSliderLeftHalf()
            this.#toggleOutputOutline(true)
        }
        inputRight.oninput = () => {
            this.updateSliderRightHalf()
            this.#toggleOutputOutline(false)
        }

        loopToggleButton.onclick = () => this.#toggleLoopCheckbox()

        outputLeft.onchange = (e) => this.#handleInput(e)
        outputRight.onchange = (e) => this.#handleInput(e)

        outputLeft.onclick = () => this.#toggleOutputOutline(true)
        outputRight.onclick = () => this.#toggleOutputOutline(false)

        inputLeft.addEventListener('mouseover', () => thumbLeft.classList.add('hover'))
        inputLeft.addEventListener('mouseout', () => thumbLeft.classList.remove('hover'))
        inputLeft.addEventListener('mousedown', () => thumbLeft.classList.add('active'))
        inputLeft.addEventListener('mouseup', (e) => {
            thumbLeft.classList.remove('active')
            const currentValue = e.target.value
            this.#setCurrentTimePosition({ attribute: 'startTime', position: currentValue })
        })

        inputRight.addEventListener('mouseover', () => thumbRight.classList.add('hover'))
        inputRight.addEventListener('mouseout', () => thumbRight.classList.remove('hover'))
        inputRight.addEventListener('mousedown', () => thumbRight.classList.add('active'))
        inputRight.addEventListener('mouseup', (e) => {
            thumbRight.classList.remove('active')
            const currentValue = e.target.value
            this.#setCurrentTimePosition({ attribute: 'endTime', position: currentValue })
        })
    }

    #toggleLoopCheckbox() {
        const loopCheckBox = this.#elements.loopCheckBox
        loopCheckBox.checked = !loopCheckBox.checked
        this.#setCheckedUI(loopCheckBox.checked)
    }

    #setCheckedUI(loop) {
        const { loopToggleOn, loopToggleOff } = this.#elements

        loopToggleOn.style.display = loop ? 'block' : 'none'
        loopToggleOff.style.display = loop ? 'none' : 'block'
    }

    #toggleOutputOutline(outlineLeft) {
        if (outlineLeft) {
            if (this._setLeft) return
            this._setLeft = true
            this._setRight = false
        } else {
            if (this._setRight) return
            this._setRight = true
            this._setLeft = false
        }

        const { outputLeft, outputRight } = this.#elements
        outputLeft.style.border = outlineLeft ? '1px solid #fff' : 'none'
        outputRight.style.border = outlineLeft ? 'none' : '1px solid #fff'

        if (outlineLeft) {
            outputLeft.focus()
            outputRight.blur()
        }
        if (!outlineLeft) {
            outputLeft.blur()
            outputRight.focus()
        }
    }

    setInitialValues(track) {
        this._isCurrentlyPlaying = !track?.id ? true : track.id == currentSongInfo().id

        const { endTime, startTime, autoLoop = false } = track
        const { endDisplay, outputLeft, outputRight, loopCheckBox } = this.#elements
        const duration = track?.duration ?? playback.duration()

        endDisplay.textContent = secondsToTime(duration)
        this.#setMaxMin(duration)

        const startValue = startTime ?? 0
        this.updateSliderLeftHalf(startValue)
        outputLeft.value = formatTimeInSeconds(startTime)

        const endValue = endTime ?? duration
        this.updateSliderRightHalf(endValue)
        outputRight.value = formatTimeInSeconds(endTime)

        loopCheckBox.checked = autoLoop
        this.#setCheckedUI(autoLoop)
    }

    #setMaxMin(duration) {
        const { inputLeft, inputRight } = this.#elements
        inputLeft.max = duration
        inputRight.max = duration
    }

    get #elements() {
        return {
            endDisplay: document.getElementById('end'),
            outputRight: document.getElementById('chorus-end'),
            outputLeft: document.getElementById('chorus-start'),

            inputLeft: document.getElementById('input-start'),
            inputRight: document.getElementById('input-end'),
            range: document.querySelector('.slider > .range'),
            thumbLeft: document.querySelector('.slider > .thumb.left'),
            thumbRight: document.querySelector('.slider > .thumb.right'),

            loopCheckBox: document.getElementById('loop-checkbox'),
            loopToggleOn: document.getElementById('loop-toggle-on'),
            loopToggleOff: document.getElementById('loop-toggle-off'),
            loopToggleButton: document.getElementById('loop-toggle-button')
        }
    }

    #setCurrentTimePosition({ attribute, position }) {
        this._isCurrentlyPlaying && (this._video.currentTime = position)

        this._video.element.setAttribute(attribute, position)
        this._video.element.setAttribute(
            'lastSetThumb',
            attribute.startsWith('start') ? 'start' : 'end'
        )
    }

    #validateInput(timeString, maxValue) {
        const regex = /^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/
        const match = timeString.match(regex)

        if (!match) return false

        const [, hours, mins, secs, ms] = match
        const [maxH, maxM, maxS, maxMS] = maxValue.split(':').map(Number)

        const totalMilliseconds = timeToMilliseconds({ hours, mins, secs, ms })
        const maxTotalMilliseconds = timeToMilliseconds({
            hours: maxH,
            mins: maxM,
            secs: maxS,
            ms: maxMS
        })

        if (totalMilliseconds < 0 || totalMilliseconds > maxTotalMilliseconds) return false

        return true
    }

    #handleInput({ target: { id, value } }) {
        const updateLeft = this.#elements.inputLeft.id.includes(id?.split('-')?.at(-1))
        const lastSetThumb = id.includes('start') ? 'start' : 'end'

        const isValid = this.#validateInput(value, formatTimeInSeconds(playback.duration()))
        const inputElement = updateLeft ? this.#elements.inputLeft : this.#elements.inputRight
        const valueInSeconds = isValid ? timeToSeconds(value) : inputElement.value

        this._video.element.setAttribute('lastSetThumb', lastSetThumb)
        updateLeft
            ? this.updateSliderLeftHalf(valueInSeconds)
            : this.updateSliderRightHalf(valueInSeconds)

        this.#toggleOutputOutline(updateLeft)

        const attribute = updateLeft ? 'startTime' : 'endTime'
        this.#setCurrentTimePosition({ attribute, position: valueInSeconds })
    }

    updateSliderLeftHalf(currentValue) {
        const { inputLeft, inputRight, range, thumbLeft, outputLeft } = this.#elements
        inputLeft.value = Math.min(
            parseFloat(currentValue ?? inputLeft.value),
            parseFloat(inputRight.value) - 1
        )

        const percent = ((inputLeft.value - inputLeft.min) / (inputLeft.max - inputLeft.min)) * 100
        thumbLeft.style.left = `${percent}%`
        range.style.left = `${percent}%`
        outputLeft.value = formatTimeInSeconds(inputLeft.value)
    }

    updateSliderRightHalf(currentValue) {
        const { inputLeft, inputRight, thumbRight, range, outputRight } = this.#elements
        inputRight.value = Math.max(
            parseFloat(currentValue ?? inputRight.value),
            parseFloat(inputLeft.value)
        )

        const percent =
            ((inputRight.value - inputRight.min) / (inputRight.max - inputRight.min)) * 100
        thumbRight.style.right = `${100 - percent}%`
        range.style.right = `${100 - percent}%`
        outputRight.value = formatTimeInSeconds(inputRight.value)
    }
}
