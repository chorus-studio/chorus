import Snip from './snip.js'

import { trackSongInfo } from '../../utils/song.js'
import { highlightElement } from '../../utils/highlight.js'

export default class TrackSnip extends Snip {
    constructor(store) {
        super(store)

        this._row = null
    }

    async init(row) {
        super.init()

        this._row = row
        this._controls.init()
        this.#displayTrackInfo()
        const { id, endTime: duration } = trackSongInfo(row)
        const track = await this.read()
        this._controls.setInitialValues({ ...track, id, duration })
    }

    #displayTrackInfo() {
        const { id } = trackSongInfo(this._row)
        const [title, artists] = id.split(' by ')
        super._setTrackInfo({ title, artists })
    }

    get _defaultTrack() {
        const track = trackSongInfo(this._row)

        return {
            id: track.id,
            value: {
                ...track,
                endTime,
                startTime: 0,
                isSnip: false,
                isSkipped: false
            }
        }
    }

    updateView(songStateData) {
        super._updateView()
        this.highlightSnip(songStateData)
    }

    toggleIconVisibility({ isSnip }) {
        const icon = this._row.queryselector('button[role="snip"]')
        icon.style.visibility = isSnip ? 'visible' : 'hidden'
    }

    highlightSnip(songStateData) {
        highlightElement({
            songStateData,
            property: 'color',
            context: this._row,
            selector: 'svg[role="snip"]'
        })

        this.toggleIconVisibility(songStateData)
    }

    get trackURL() {
        const { url } = trackSongInfo(this._row)
        return url
    }

    share() {
        super._share()
    }

    async delete() {
        await super._delete()
    }

    async save() {
        const { inputLeft, inputRight } = this._elements
        const { isSkipped } = await this.read()

        const songStateData = await this._store.saveTrack({
            id: trackSongInfo(this._row).id,
            value: {
                isSnip: true,
                startTime: inputLeft.value,
                endTime: inputRight.value,
                isSkipped: inputRight.value == 0 || isSkipped
            }
        })

        this.updateView(songStateData)
    }
}
