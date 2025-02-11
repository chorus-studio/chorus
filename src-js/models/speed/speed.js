import RangeSlider from '../range/range.js'

import { store } from '../../stores/data.js'
import { currentData } from '../../data/current.js'

import { spotifyVideo } from '../../actions/overload.js'

export default class Speed {
    constructor() {
        this._store = store
        this._video = spotifyVideo.element
        this._controls = new RangeSlider(this._video)
    }

    async init() {
        const data = await currentData.getPlaybackValues()
        this._controls.init(data)
    }

    clearCurrentSpeed() {
        this._video.clearCurrentSpeed()
    }

    get #inputValues() {
        const { input, speedCheckbox, pitchCheckbox } = this._controls.elements
        return {
            playbackRate: input.value,
            preservesPitch: pitchCheckbox?.checked,
            settingGlobalSpeed: speedCheckbox?.checked
        }
    }

    async save() {
        const { playbackRate, preservesPitch } = this.#inputValues
        await this.#saveSelectedSpeed({ playbackRate, preservesPitch })
    }

    async saveTrackSpeed({ playbackRate, preservesPitch }) {
        const trackInfo = await currentData.readTrack()
        await this._store.saveTrack({
            id: currentData.songId,
            value: { ...trackInfo, playbackRate, preservesPitch }
        })

        this.#updateVideoSpeed({ playbackRate, preservesPitch })
    }

    #updateVideoSpeed({ playbackRate, preservesPitch }) {
        this._video.currentSpeed = playbackRate
        this._video.playbackRate = playbackRate
        this._video.preservesPitch = preservesPitch
    }

    async saveGlobalSpeed({ playbackRate, preservesPitch }) {
        const globalsInfo = await currentData.readGlobals()
        const trackInfo = await currentData.readTrack()

        await this._store.saveTrack({
            id: 'globals',
            value: { ...globalsInfo, playbackRate, preservesPitch }
        })
        if (!trackInfo?.playbackRate) this.#updateVideoSpeed({ playbackRate, preservesPitch })
    }

    async #saveSelectedSpeed(speedValues) {
        await (this.#inputValues.settingGlobalSpeed
            ? this.saveGlobalSpeed(speedValues)
            : this.saveTrackSpeed(speedValues))
    }

    async reset() {
        await this.#saveSelectedSpeed({ playbackRate: 1, preservesPitch: true })
        await this.init()
    }
}
