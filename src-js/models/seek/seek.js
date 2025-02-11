import SeekIcons from './seek-icon.js'
import SeekController from './seek-controller.js'

import { store } from '../../stores/data.js'
import { currentData } from '../../data/current.js'

export default class Seek {
    constructor() {
        this._store = store
        this._seekIcons = new SeekIcons()
        this._controls = new SeekController()
    }

    async init() {
        const data = await currentData.getSeekValues()
        this._controls.init(data)
    }

    get #inputValues() {
        const { rwInput, ffInput, seekCheckbox } = this._controls.elements
        return { rw: rwInput.value, ff: ffInput.value, updateShows: seekCheckbox.checked }
    }

    async save() {
        const { rw, ff, updateShows } = this.#inputValues
        await this.#saveSeeking({ rw, ff, updateShows })
    }

    async reset() {
        const { updateShows } = this.#inputValues
        const seekTimeValue = updateShows ? 15 : 10
        await this.#saveSeeking({ rw: seekTimeValue, ff: seekTimeValue, updateShows })
        await this.init()
    }

    async #saveSeeking({ rw, ff, updateShows }) {
        const { shows, global } = await currentData.getSeekValues()
        await this._store.saveTrack({
            id: 'chorus-seek',
            value: {
                shows: { ...shows, ...(updateShows && { rw, ff }) },
                global: { ...global, ...(!updateShows && { rw, ff }) }
            }
        })
        await this._seekIcons.setSeekLabels()
    }
}
