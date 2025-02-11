import Reverb from '../models/reverb/reverb.js'
import VideoElement from '../models/video/video.js'
import AudioManager from '../models/audio-manager.js'
import Equalizer from '../models/equalizer/equalizer.js'

class SpotifyVideo {
    _reverb
    _equalizer

    constructor() {
        this._video
        this._reverb
        this._equalizer
        this._originalCreateElement = document.createElement
        this.#init()
    }

    #init() {
        const self = this

        document.createElement = function (tagName) {
            const element = self._originalCreateElement.apply(this, arguments)

            if (tagName === 'video') {
                const audioManager = new AudioManager(element)
                self._reverb = new Reverb(audioManager)
                self._equalizer = new Equalizer(audioManager)
                self._video = new VideoElement({
                    video: element,
                    reverb: self._reverb,
                    equalizer: self._equalizer
                })
                document.createElement = self._originalCreateElement
            }
            return element
        }
    }

    get element() {
        return this._video
    }

    get reverb() {
        return this._reverb
    }

    get equalizer() {
        return this._equalizer
    }
}

export const spotifyVideo = new SpotifyVideo()
