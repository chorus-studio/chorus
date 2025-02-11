import { store } from '../stores/data.js'
import CurrentSnip from './snip/current-snip.js'
import TrackList from './tracklist/track-list.js'
import NowPlayingIcons from './now-playing-icons.js'

import Chorus from './chorus.js'
import ToolTip from './tooltip.js'
import QueueObserver from '../observers/queue.js'
import SongTracker from '../observers/song-tracker.js'
import TrackListObserver from '../observers/track-list.js'
import NowPlayingObserver from '../observers/now-playing.js'
import ArtistDiscoObserver from '../observers/artist-disco.js'

export default class App {
    constructor(spotifyVideo) {
        this._store = store
        this._video = spotifyVideo.element
        this._reverb = spotifyVideo.reverb
        this._equalizer = spotifyVideo.equalizer

        this._active = true
        this._intervalId = null

        this.#init()
    }

    #init() {
        this._toolTip = new ToolTip()
        this._songTracker = new SongTracker()
        this._chorus = new Chorus(this._songTracker)
        this._snip = new CurrentSnip(this._songTracker)

        this._nowPlayingIcons = new NowPlayingIcons({ snip: this._snip, chorus: this._chorus })
        this._nowPlayingObserver = new NowPlayingObserver({
            snip: this._snip,
            chorus: this._chorus,
            songTracker: this._songTracker
        })
        this._queueObserver = new QueueObserver()
        this._trackListObserver = new TrackListObserver(new TrackList(this._songTracker))
        this._artistDiscoObserver = new ArtistDiscoObserver()

        this.#resetInterval()
        this.#reInit()
    }

    #resetInterval() {
        if (!this._intervalId) return

        clearInterval(this._intervalId)
        this._intervalId = null
    }

    disconnect() {
        this._active = false
        this._video.reset()

        this._toolTip.removeUI()
        this._nowPlayingIcons.clearIcons()

        this._queueObserver.disconnect()
        this._trackListObserver.disconnect()
        this._nowPlayingObserver.disconnect()
        this._artistDiscoObserver.disconnect()

        this.#resetInterval()

        if (navigator.userAgent.includes('Firefox')) return

        this._reverb.setReverbEffect('none')
        this._equalizer.setEQEffect('none')
    }

    connect() {
        this._active = true
        this._chorus.init()

        this._toolTip.placeUI()
        this._nowPlayingIcons.placeIcons()

        this._queueObserver.observe()
        this._trackListObserver.observe()
        this._nowPlayingObserver.observe()
        this._artistDiscoObserver.observe()

        this.#resetInterval()
        this.#reInit()
    }

    #reInit() {
        this._intervalId = setInterval(async () => {
            if (!this._active) return
            if (!this._intervalId) return

            const chorus = document.getElementById('chorus')
            if (!chorus) this._nowPlayingIcons.placeIcons()
        }, 3000)
    }
}
