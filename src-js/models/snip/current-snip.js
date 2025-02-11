import Snip from './snip.js'
import { currentData } from '../../data/current.js'
import { spotifyVideo } from '../../actions/overload.js'

import { playback } from '../../utils/playback.js'
import { currentSongInfo } from '../../utils/song.js'
import { highlightIcon } from '../../utils/highlight.js'

export default class CurrentSnip extends Snip {
    constructor(songTracker) {
        super()

        this._songTracker = songTracker
        this._video = spotifyVideo.element
    }

    async init() {
        super.init()

        this._controls.init()
        this.#displayTrackInfo()
        const track = await this.read()
        this._controls.setInitialValues(track)
    }

    #displayTrackInfo() {
        const { id } = currentSongInfo()
        const [title, artists] = id.split(' by ')
        super._setTrackInfo({ title, artists })
    }

    get _defaultTrack() {
        return currentData.readTrack()
    }

    updateView() {
        super._updateView()
    }

    get trackURL() {
        return currentSongInfo().url
    }

    share() {
        super._share()
    }

    skipTrackOnSave({ isSkipped }) {
        isSkipped && document.querySelector('[data-testid="control-button-skip-forward"]')?.click()
    }

    async delete() {
        const track = await this.read()
        const updatedValues = await this._store.saveTrack({
            id: currentSongInfo().id,
            value: { ...track, isSnip: false, startTime: 0, endTime: playback.duration() }
        })
        await this._songTracker.updateCurrentSongData(updatedValues)
    }

    async save() {
        const track = await this.read()
        const { loopCheckBox, inputLeft, inputRight, title, artists } = this._elements
        const { id, isSkipped } = track

        const trackId = id ?? `${title.textContent} by ${artists.textContent}`
        const result = await this._store.saveTrack({
            id: trackId,
            value: {
                ...track,
                id: trackId,
                isSnip: true,
                startTime: inputLeft.value,
                endTime: inputRight.value,
                autoLoop: loopCheckBox.checked,
                isSkipped: inputRight.value == 0 || isSkipped
            }
        })

        this._video.resetTempTimes()
        this.updateView()
        highlightIcon({ highlight: result?.autoLoop ?? false, selector: '#loop-icon' })
        this.skipTrackOnSave(result)

        await this._songTracker.updateCurrentSongData(result)
    }
}
