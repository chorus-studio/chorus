import { createSnipControls } from '../components/snip/snip-controls.js'
import { createSpeedControls } from '../components/speed/speed-controls.js'
import { createSeekControls } from '../components/seek/seek-controls.js'
import { createEffectsControls } from '../components/effects/effects-controls.js'
import { createEqualizerControls } from '../components/equalizer/equalizer-controls.js'

import HeaderListeners from '../events/listeners/header-listeners.js'
import ActionListeners from '../events/listeners/action-listeners.js'

import { parseNodeString } from '../utils/parser.js'
import { spotifyVideo } from '../actions/overload.js'
import { clickOutside } from '../utils/click-outside.js'

export default class Chorus {
    constructor(songTracker) {
        this._songTracker = songTracker
        this._video = spotifyVideo.element
        this._clickOutsideHandler = null
    }

    init() {
        this.headerListeners = new HeaderListeners(this._songTracker)
        this.actionListeners = new ActionListeners(this._songTracker)
    }

    get isShowing() {
        if (!this.mainElement) return false

        return this.mainElement.style.display == 'block'
    }

    get mainElement() {
        return document.getElementById('chorus-main')
    }

    get chorusControls() {
        return document.getElementById('chorus-controls')
    }

    async toggle() {
        this.isShowing ? await this.hide() : this.show()
    }

    get #hasSnipControls() {
        return !!document.getElementById('chorus-snip-controls')
    }

    #setupModal() {
        if (this._clickOutsideHandler) return
        this._clickOutsideHandler = clickOutside({ node: this.mainElement })
        this.mainElement.addEventListener('click_outside', this.hide)
    }

    #insertIntoDOM() {
        if (this.#hasSnipControls) return

        const controls = [
            createSnipControls(),
            createSpeedControls(),
            createSeekControls(),
            createEffectsControls(),
            createEqualizerControls()
        ].map(parseNodeString)

        controls.forEach((control) => this.chorusControls.appendChild(control))
    }

    #cleanUpOutsideHandler() {
        this._clickOutsideHandler?.destroy()
        this._clickOutsideHandler = null
    }

    hide = async () => {
        if (!this.mainElement) return

        await this.headerListeners.hide()
        this.mainElement.style.display = 'none'
        this._video.resetTempTimes()

        this.#cleanUpOutsideHandler()
        this.headerListeners._reverb.destroyClickHandlers()
    }

    show() {
        this.#insertIntoDOM()
        this.mainElement.style.display = 'block'

        this.headerListeners.init()
        this.actionListeners.init()
        this.#setupModal()
    }
}
