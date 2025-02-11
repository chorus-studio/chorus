export default class SeekController {
    constructor() {
        this._data = null
    }

    init(data) {
        if (!this._data) {
            this.#setupEvents()
        }

        const { shows, global, seekChecked } = data
        const { rwInput, ffInput, seekCheckbox } = this.elements

        rwInput.value = seekChecked ? shows.rw : global.rw
        ffInput.value = seekChecked ? shows.ff : global.ff

        seekCheckbox.checked = seekChecked
        this.#setCheckedUI(seekChecked)
        this.#highlightSeekValue(seekChecked)

        this._data = data
    }

    #setupEvents() {
        const { seekToggleButton, rwButtonUp, rwButtonDown, ffButtonUp, ffButtonDown } =
            this.elements

        rwButtonUp.onclick = (e) => this.#handleButtonPress(e)
        rwButtonDown.onclick = (e) => this.#handleButtonPress(e)
        ffButtonUp.onclick = (e) => this.#handleButtonPress(e)
        ffButtonDown.onclick = (e) => this.#handleButtonPress(e)

        seekToggleButton.onclick = () => this.#toggleSeekCheckbox()
    }

    #handleButtonPress(event) {
        const { target } = event
        const { rwInput, ffInput } = this.elements

        // ex. ff-up
        const [seekAction, direction] = target.getAttribute('role').split('-')

        if (seekAction == 'ff') {
            const currentFFValue = parseInt(ffInput.value)
            ffInput.value =
                direction == 'up'
                    ? Math.min(currentFFValue + 1, ffInput.max)
                    : Math.max(currentFFValue - 1, ffInput.min)
        } else {
            const currentRWValue = parseInt(rwInput.value)
            rwInput.value =
                direction == 'up'
                    ? Math.min(currentRWValue + 1, rwInput.max)
                    : Math.max(currentRWValue - 1, rwInput.min)
        }
    }

    #setCheckedUI(seekChecked) {
        const { seekLabel, seekCheckbox, seekToggleOn, seekToggleOff } = this.elements

        seekToggleOn.style.display = seekChecked ? 'block' : 'none'
        seekToggleOff.style.display = seekChecked ? 'none' : 'block'

        seekLabel.textContent = seekChecked ? 'Podcasts/AudioBooks' : 'Global'
        seekCheckbox.checked = seekChecked
    }

    #toggleSeekCheckbox() {
        const { rwInput, ffInput, seekCheckbox } = this.elements

        seekCheckbox.checked = !seekCheckbox.checked
        const { checked } = seekCheckbox
        this.#setCheckedUI(checked)

        const { shows, global } = this._data

        rwInput.value = checked ? shows.rw : global.rw
        ffInput.value = checked ? shows.ff : global.ff

        this.#highlightSeekValue(checked)
    }

    #highlightSeekValue(checked) {
        const { seekShowsLabel, seekGlobalLabel } = this.elements
        seekGlobalLabel.style.background = checked ? 'unset' : 'green'
        seekShowsLabel.style.background = checked ? 'green' : 'unset'
    }

    get elements() {
        return {
            rwInput: document.getElementById('seek-rw-input'),
            ffInput: document.getElementById('seek-ff-input'),

            rwButtonUp: document.getElementById('seek-rw-up-button'),
            rwButtonDown: document.getElementById('seek-rw-down-button'),

            ffButtonUp: document.getElementById('seek-ff-up-button'),
            ffButtonDown: document.getElementById('seek-ff-down-button'),

            seekLabel: document.getElementById('seek-label'),
            seekToggleOn: document.getElementById('seek-toggle-on'),
            seekToggleOff: document.getElementById('seek-toggle-off'),

            seekCheckbox: document.getElementById('seek-checkbox'),
            seekToggleButton: document.getElementById('seek-toggle-button'),

            seekShowsLabel: document.getElementById('seek-shows-label'),
            seekGlobalLabel: document.getElementById('seek-global-label')
        }
    }
}
