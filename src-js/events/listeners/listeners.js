import { store } from '../../stores/data.js'
import Seek from '../../models/seek/seek.js'
import Speed from '../../models/speed/speed.js'
import { spotifyVideo } from '../../actions/overload.js'
import CurrentSnip from '../../models/snip/current-snip.js'
import ReverbController from '../../models/reverb/reverb-controller.js'
import EqualizerController from '../../models/equalizer/equalizer-controller.js'

export default class Listeners {
    constructor(songTracker) {
        this._store = store
        this._video = spotifyVideo.element
        this._seek = new Seek()
        this._speed = new Speed()
        this._snip = new CurrentSnip(songTracker)
        this._reverb = new ReverbController()
        this._equalizer = new EqualizerController()
    }

    _hide() {
        const mainElement = document.getElementById('chorus-main')
        mainElement.style.display = 'none'
        this._video.resetTempTimes()
        this._reverb.destroyClickHandlers()
        this._equalizer.destroyClickHandlers()
    }
}
