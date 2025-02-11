import Listeners from './listeners.js'
import { spotifyVideo } from '../../actions/overload.js'

export default class HeaderListeners extends Listeners {
    constructor(songTracker) {
        super(songTracker)

        this._setup = false
        this._viewInFocus = null
        this._video = spotifyVideo.element
        this._VIEWS = ['snip', 'speed', 'fx', 'eq', 'seek']
    }

    init() {
        if (this._setup) {
            this._viewInFocus == 'seek' && this._seek.init()
            this._viewInFocus == 'fx' && this._reverb.init()
            this._viewInFocus == 'eq' && this._equalizer.init()
            this._viewInFocus == 'speed' && this._speed.init()
            return
        }

        this.#snipViewToggle()
        this.#seekViewToggle()
        this.#speedViewToggle()
        this.#effectsViewToggle()
        this.#equalizerViewToggle()
        this.#closeModalListener()

        this.currentView = 'snip'
        this._setup = true
    }

    #clearReverb() {
        const reverb = this._store.getReverb() || 'none'
        if (reverb == 'none') this._reverb.clearReverb()
    }

    #clearEqualizer() {
        const equalizer = this._store.getEqualizer() || 'none'
        if (equalizer == 'none') this._equalizer.clearEqualizer()
    }

    async hide() {
        if (this._viewInFocus == 'fx') this.#clearReverb()
        if (this._viewInFocus == 'eq') this.#clearEqualizer()
        if (this._viewInFocus == 'speed') this._speed.clearCurrentSpeed()
        this._hide()
    }

    #seekViewToggle() {
        const seekButton = document.getElementById('chorus-seek-button')
        seekButton?.addEventListener('click', async () => {
            this.currentView = 'seek'
            await this._seek.init()
        })
    }

    set currentView(selectedView = 'snip') {
        this._viewInFocus = selectedView
        if (selectedView != 'snip') this._video.resetTempTimes()
        this._reverb.destroyClickHandlers()
        this._equalizer.destroyClickHandlers()

        this._VIEWS.forEach((view) => {
            const viewButton = document.getElementById(`chorus-${view}-button`)
            const viewInFocusContainer = document.getElementById(`chorus-${view}-controls`)
            if (!viewButton || !viewInFocusContainer) return

            viewButton.style.background = view == selectedView ? 'green' : '#535353'
            viewInFocusContainer.style.display = view == selectedView ? 'flex' : 'none'
        })
    }

    #snipViewToggle() {
        const snipButton = document.getElementById('chorus-snip-button')
        snipButton?.addEventListener('click', async () => {
            this.currentView = 'snip'
            await this._snip.init()
        })
    }

    #speedViewToggle() {
        const speedButton = document.getElementById('chorus-speed-button')
        speedButton?.addEventListener('click', async () => {
            this.currentView = 'speed'
            await this._speed.init()
        })
    }

    #effectsViewToggle() {
        const effectsButton = document.getElementById('chorus-fx-button')
        effectsButton?.addEventListener('click', () => {
            this.currentView = 'fx'
            this._reverb.init()
        })
    }

    #equalizerViewToggle() {
        const effectsButton = document.getElementById('chorus-eq-button')
        effectsButton?.addEventListener('click', () => {
            this.currentView = 'eq'
            this._equalizer.init()
        })
    }

    #closeModalListener() {
        const closeButton = document.getElementById('chorus-modal-close-button')
        closeButton?.addEventListener('click', async () => {
            await this.hide()
        })
    }
}
