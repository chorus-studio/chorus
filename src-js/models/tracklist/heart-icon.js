import TrackListIcon from './tracklist-icon.js'
import { TRACK_HEART, createIcon } from '../../components/icons/icon.js'

import { getTrackId, trackSongInfo } from '../../utils/song.js'
import Dispatcher from '../../events/dispatcher.js'
import { currentData } from '../../data/current.js'
import { highlightIconTimer } from '../../utils/highlight.js'
import { updateToolTip } from '../../utils/tooltip.js'

export default class HeartIcon extends TrackListIcon {
    constructor(store) {
        super({
            store,
            key: 'isLiked',
            selector: 'button[role="heart"]'
        })
        this._dispatcher = new Dispatcher()
    }

    get #isOnLikedSongsPage() {
        return location.pathname == '/collection/tracks'
    }

    #isLiked(row) {
        if (this.#isOnLikedSongsPage) return true

        if (row.getAttribute('data-testid') != 'tracklist-row') return false

        const { trackId = null } = getTrackId(row)
        if (!trackId) return false

        return !!this._store.checkInCollection(trackId)
    }

    async toggleTrackLiked(row) {
        const { trackId = null } = getTrackId(row)
        if (!trackId) return

        const isLiked = this.#isOnLikedSongsPage ? true : this.#isLiked(row)
        const method = isLiked ? 'DELETE' : 'PUT'

        const { state } = await this._dispatcher.sendEvent({
            eventType: 'tracks.update',
            detail: { key: 'tracks.update', values: { id: trackId, method } }
        })

        if (state == 'error') return

        const saved = method == 'PUT'
        this._store.saveInCollection({ id: trackId, saved })

        const icon = row.querySelector(this._selector)
        this.animate(icon, saved)
        updateToolTip(icon)

        const { id: songId } = trackSongInfo(row)
        await this.#updateCurrentTrack({ songId, highlight: saved })
    }

    async #updateCurrentTrack({ songId, highlight }) {
        const { id } = await currentData.readTrack()
        if (id !== songId) return

        highlightIconTimer({
            highlight,
            fill: true,
            selector: '#chorus-heart > svg'
        })

        const heartIcon = document.querySelector('#chorus-heart')
        const text = `${highlight ? 'Remove from' : 'Save to'} Liked`
        heartIcon?.setAttribute('aria-label', text)
    }

    setInitialState(row) {
        const icon = row.querySelector(this._selector)
        this.animate(icon)
    }

    #burn({ icon, burn }) {
        const svg = icon.querySelector('svg')

        if (burn) {
            icon.style.visibility = 'visible'
        }

        icon.setAttribute('aria-label', `${burn ? 'Remove from' : 'Save to'} Liked`)
        svg.style.fill = burn ? '#1ed760' : 'transparent'
        svg.style.stroke = burn ? '#1ed760' : 'currentColor'
    }

    #glow({ icon, glow }) {
        const svg = icon.querySelector('svg')

        svg.addEventListener('mouseover', () => {
            if (glow && svg.style.fill == '#1ed760') return

            svg.style.fill = glow ? '#1ed760' : 'transparent'
            svg.style.stroke = glow ? '#1ed760' : '#fff'
        })

        svg.addEventListener('mouseleave', () => {
            if (glow && svg.style.fill == '#1ed760') return

            svg.style.fill = glow ? '#1ed760' : 'transparent'
            svg.style.stroke = glow ? '#1ed760' : 'currentColor'
        })
    }

    animate(icon, heart) {
        if (!icon?.parentElement) return

        const isLiked = heart ?? this.#isLiked(icon?.parentElement?.parentElement)

        this.#burn({ icon, burn: isLiked })
        this.#glow({ icon, glow: isLiked })
    }

    setUI(row) {
        super._setUI(row)
    }

    get _iconUI() {
        return createIcon(TRACK_HEART)
    }
}
