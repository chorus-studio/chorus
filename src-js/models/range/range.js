export default class RangeSlider {
    constructor(video) {
        this._video = video
        this._data = null
    }

    init(data) {
        if (!this._data) this.#setupEvents()

        const { track, globals, preferredRate, preferredPitch } = data
        const { input, speedTrackValue, speedGlobalValue, speedCheckbox, pitchCheckbox } =
            this.elements

        input.value = preferredRate
        this.#setSpeedAndVideoValues({
            playbackRate: preferredRate,
            preservesPitch: preferredPitch
        })

        const speedChecked = track?.playbackRate ? false : true
        const pitchChecked = track?.preservesPitch ?? preferredPitch

        speedCheckbox.checked = speedChecked
        pitchCheckbox.checked = pitchChecked

        this.#setCheckedUI({ speedChecked, pitchChecked })

        speedTrackValue.value = this.#padValue(track?.playbackRate || 1)
        speedGlobalValue.value = this.#padValue(globals?.playbackRate || 1)

        this.#hightlightSpeedValue(speedChecked)

        this._data = data
    }

    // TODO: move into utils
    #padValue(value, decimalPlace = 3) {
        if (isNaN(parseFloat(value))) return value

        return parseFloat(value).toFixed(decimalPlace)
    }

    #setupEvents() {
        const {
            input,
            thumb,
            speedGlobalValue,
            speedTrackValue,
            pitchToggleButton,
            speedToggleButton
        } = this.elements

        input.oninput = () => this.#setSpeedValue({})
        speedTrackValue.onchange = (e) => this.#handleInput(e.target.value)
        speedGlobalValue.onchange = (e) => this.#handleInput(e.target.value)

        input.addEventListener('mouseover', () => thumb.classList.add('hover'))
        input.addEventListener('mouseout', () => thumb.classList.remove('hover'))
        input.addEventListener('mousedown', () => {
            thumb.classList.add('active')
        })
        input.addEventListener('mouseup', () => {
            thumb.classList.remove('active')
            this.#setSpeedAndVideoValues()
        })

        speedToggleButton.onclick = () => this.#toggleSpeedCheckbox()
        pitchToggleButton.onclick = () => this.#togglePitchCheckbox()
    }

    #isValidRate(value) {
        if (isNaN(value) || value < 0.1 || value > 4) return false

        return true
    }

    #handleInput(inputValue) {
        const parsedValue = parseFloat(inputValue)
        const isValid = this.#isValidRate(parsedValue)
        const currentValue = this.elements.input.value
        const playbackRate = isValid ? this.#padValue(parsedValue) : this.#padValue(currentValue)

        this.elements.input.value = playbackRate
        this.#setSpeedAndVideoValues({ playbackRate })
    }

    #setCheckedUI({ speedChecked, pitchChecked }) {
        const { pitchToggleOn, pitchToggleOff, speedToggleOn, speedToggleOff } = this.elements

        speedToggleOn.style.display = speedChecked ? 'block' : 'none'
        speedToggleOff.style.display = speedChecked ? 'none' : 'block'
        pitchToggleOn.style.display = pitchChecked ? 'block' : 'none'
        pitchToggleOff.style.display = pitchChecked ? 'none' : 'block'

        const { pitchCheckbox, speedLabel, speedCheckbox } = this.elements

        speedLabel.textContent = speedChecked ? 'Global Speed' : 'Track Speed'
        speedCheckbox.checked = speedChecked
        pitchCheckbox.checked = pitchChecked
    }

    #toggleSpeedCheckbox() {
        const { input, speedCheckbox, speedTrackValue, speedGlobalValue, pitchCheckbox } =
            this.elements
        speedCheckbox.checked = !speedCheckbox.checked

        const { checked } = speedCheckbox
        this.#setCheckedUI({ speedChecked: checked, pitchChecked: pitchCheckbox.checked })

        const { track, globals } = this._data

        input.value = checked
            ? parseFloat(speedGlobalValue.value) || globals?.playbackRate || 1
            : parseFloat(speedTrackValue.value) || track?.playbackRate || 1

        this._video.currentSpeed = input.value

        this.#hightlightSpeedValue(checked)
        this.#setSpeedAndVideoValues({ playbackRate: input.value })
    }

    #hightlightSpeedValue(speedChecked) {
        const { speedTrackValue, speedGlobalValue } = this.elements

        speedGlobalValue.disabled = !speedChecked
        speedTrackValue.disabled = speedChecked

        speedGlobalValue.style.backgroundColor = speedChecked ? 'green' : 'unset'
        speedGlobalValue.style.border = speedChecked ? '1px solid #fff' : 'none'

        speedTrackValue.style.backgroundColor = !speedChecked ? 'green' : 'unset'
        speedTrackValue.style.border = !speedChecked ? '1px solid #fff' : 'none'

        if (speedChecked) {
            speedGlobalValue.focus()
            speedTrackValue.blur()
        }
        if (!speedChecked) {
            speedGlobalValue.blur()
            speedTrackValue.focus()
        }
    }

    #togglePitchCheckbox() {
        const { pitchCheckbox, pitchToggleOn, pitchToggleOff } = this.elements
        pitchCheckbox.checked = !pitchCheckbox.checked

        const { checked } = pitchCheckbox
        pitchToggleOn.style.display = checked ? 'block' : 'none'
        pitchToggleOff.style.display = checked ? 'none' : 'block'

        this._video.preservesPitch = checked
    }

    get elements() {
        return {
            range: document.getElementById('speed-range'),
            thumb: document.getElementById('speed-thumb'),
            input: document.getElementById('speed-input'),
            minOutput: document.getElementById('speed-min'),
            maxOutput: document.getElementById('speed-max'),

            speedLabel: document.getElementById('speed-label'),

            speedTrackValue: document.getElementById('speed-track-value'),
            speedGlobalValue: document.getElementById('speed-global-value'),

            speedCheckbox: document.getElementById('speed-checkbox'),
            speedToggleOn: document.getElementById('speed-toggle-on'),
            speedToggleOff: document.getElementById('speed-toggle-off'),
            speedToggleButton: document.getElementById('speed-toggle-button'),

            pitchCheckbox: document.getElementById('pitch-checkbox'),
            pitchToggleOn: document.getElementById('pitch-toggle-on'),
            pitchToggleOff: document.getElementById('pitch-toggle-off'),
            pitchToggleButton: document.getElementById('pitch-toggle-button')
        }
    }

    #setSpeedValue({ playbackRate, preservesPitch }) {
        const { input, speedCheckbox, pitchCheckbox, range, thumb } = this.elements

        const value = playbackRate ?? input.value
        const pitchPreserved = preservesPitch ?? pitchCheckbox?.checked
        const percent = ((value - input.min) / (input.max - input.min)) * 100

        thumb.style.right = `${100 - percent}%`
        range.style.right = `${100 - percent}%`

        const { speedTrackValue, speedGlobalValue, minOutput, maxOutput } = this.elements

        minOutput.textContent = `${input.min}x`
        maxOutput.textContent = `${input.max}x`

        if (speedCheckbox?.checked) speedGlobalValue.value = this.#padValue(value)
        if (!speedCheckbox?.checked) speedTrackValue.value = this.#padValue(value)

        return { speedValue: value, pitchPreserved }
    }

    #setVideoValues({ speedValue, pitchPreserved }) {
        this._video.playbackRate = speedValue
        this._video.currentSpeed = speedValue
        this._video.preservesPitch = pitchPreserved
    }

    #setSpeedAndVideoValues({ playbackRate, preservesPitch } = {}) {
        const { speedValue, pitchPreserved } = this.#setSpeedValue({ playbackRate, preservesPitch })
        this.#setVideoValues({ speedValue, pitchPreserved })
    }
}
