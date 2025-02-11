import Slider from './slider.js'
import { playback } from '../../utils/playback.js'
import { formatTimeInSeconds } from '../../utils/time.js'

export default class SliderControls {
    constructor() {
        this._slider = new Slider()
    }

    init() {
        this._slider.init()
    }

    setInitialValues(track) {
        this._slider.setInitialValues(track)
        this.#setInitialStartAndEndValues(track)
    }

    get #inputElements() {
        return {
            inputStart: document.getElementById('chorus-start'),
            inputEnd: document.getElementById('chorus-end')
        }
    }

    #setInitialStartAndEndValues(track) {
        const { inputStart, inputEnd } = this.#inputElements
        inputStart.value = formatTimeInSeconds(track.startTime ?? 0)
        inputEnd.value = formatTimeInSeconds(track.endTime ?? playback.duration())
    }

    get #isControlsOpen() {
        const controls = document.getElementById('chorus-snip-controls')
        if (!controls) return false

        return controls?.style?.display == 'block'
    }

    updateControls(track) {
        if (!this.#isControlsOpen) return

        const startValue = track.startTime ?? playback.current()
        const endValue = track.endTime ?? playback.duration()
        this._slider.updateSliderLeftHalf(startValue)
        this._slider.updateSliderRightHalf(endValue)
    }
}
