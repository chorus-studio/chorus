import Listeners from './listeners.js'

export default class ActionListeners extends Listeners {
    constructor(songTracker) {
        super(songTracker)
        this._setup = false
    }

    init() {
        if (this._setup) return

        this.#resetSeekListener()
        this.#saveSeekListener()

        this.#shareTrackListener()
        this.#deleteTrackListener()
        this.#saveTrackListener()

        this.#resetSpeedListener()
        this.#saveSpeedListener()

        this.#resetReverbListener()
        this.#saveReverbListener()

        this.#resetEqualizerListener()
        this.#saveEqualizerListener()

        this._setup = true
    }

    #resetSpeedListener() {
        const resetButton = document.getElementById('chorus-speed-reset-button')
        resetButton?.addEventListener('click', async () => await this._speed.reset())
    }

    #deleteTrackListener() {
        const deleteButton = document.getElementById('chorus-snip-remove-button')
        deleteButton?.addEventListener('click', async () => {
            await this._snip.delete()
            this._hide()
        })
    }

    #saveTrackListener() {
        const saveButton = document.getElementById('chorus-snip-save-button')
        saveButton?.addEventListener('click', async () => await this._snip.save())
    }

    #saveSpeedListener() {
        const speedSaveButton = document.getElementById('chorus-speed-save-button')
        speedSaveButton?.addEventListener('click', async () => await this._speed.save())
    }

    #saveReverbListener() {
        const reverbSaveButton = document.getElementById('chorus-effects-save-button')
        reverbSaveButton?.addEventListener('click', async () => await this._reverb.saveSelection())
    }

    #resetReverbListener() {
        const reverbResetButton = document.getElementById('chorus-effects-reset-button')
        reverbResetButton?.addEventListener('click', async () => await this._reverb.clearReverb())
    }

    #saveEqualizerListener() {
        const equalizerSaveButton = document.getElementById('chorus-equalizer-save-button')
        equalizerSaveButton?.addEventListener(
            'click',
            async () => await this._equalizer.saveSelection()
        )
    }

    #resetEqualizerListener() {
        const equalizerResetButton = document.getElementById('chorus-equalizer-reset-button')
        equalizerResetButton?.addEventListener(
            'click',
            async () => await this._equalizer.clearEqualizer()
        )
    }

    #saveSeekListener() {
        const seekSaveButton = document.getElementById('chorus-seek-save-button')
        seekSaveButton?.addEventListener('click', async () => await this._seek.save())
    }

    #resetSeekListener() {
        const seekResetButton = document.getElementById('chorus-seek-reset-button')
        seekResetButton?.addEventListener('click', async () => await this._seek.reset())
    }

    #shareTrackListener() {
        const shareButton = document.getElementById('chorus-snip-share-button')
        shareButton?.addEventListener('click', () => this._snip.share())
    }
}
