import { parseNodeString } from '../utils/parser.js'
import { highlightIconTimer } from '../utils/highlight.js'

import { store } from '../stores/data.js'
import Dispatcher from '../events/dispatcher.js'
import { currentData } from '../data/current.js'
import { createIcon, HEART_ICON } from '../components/icons/icon.js'
import { updateToolTip } from '../utils/tooltip.js'

export default class HeartIcon {
    constructor() {
        this._dispatcher = new Dispatcher()
    }

    init() {
        this.#placeIcon()
    }

    removeIcon() {
        this.#heartIcon?.remove()
        this.#toggleNowPlayingButton(true)
    }

    #placeIcon() {
        this._interval = setInterval(() => {
            if (!this._interval) return

            const refNode = document.getElementById('chorus')
            if (!refNode) return

            const heartButton = parseNodeString(this.#createHeartIcon)
            const settingsButton = document.getElementById('chorus-icon')
            refNode.insertBefore(heartButton, settingsButton)
            this.#toggleNowPlayingButton(false)
            this.#setupListener()

            clearInterval(this._interval)
            this._interval = null
        }, 25)
    }

    #toggleNowPlayingButton(show) {
        const button = this.#nowPlayingButton
        if (!button) return

        button.style.visibility = show ? 'visible' : 'hidden'
        button.style.padding = show ? '0.5rem' : 0
        button.style.width = show ? '1rem' : 0
        button.parentElement.style.margin = show ? '0.5rem' : 0
    }

    get #createHeartIcon() {
        return createIcon(HEART_ICON)
    }

    get #heartIcon() {
        return document.querySelector('#chorus-heart')
    }

    #setupListener() {
        this.#heartIcon?.addEventListener('click', async () => await this.#handleClick())
    }

    async #dispatchIsInCollection(ids) {
        return await this._dispatcher.sendEvent({
            eventType: 'tracks.liked',
            detail: { key: 'tracks.liked', values: { ids } }
        })
    }

    async #dispatchGetTrackIdFromAlbum({ songId, albumId }) {
        const { state, data } = await this._dispatcher.sendEvent({
            eventType: 'tracks.album',
            detail: { key: 'tracks.album', values: { albumId } }
        })

        if (state == 'error') return null

        const foundTrack = data.tracks.items.find((track) => {
            const artists = track.artists.map((artist) => artist.name).join(',')
            const songTitle = `${track.name} by ${artists}`
            return songTitle == songId
        })

        if (!foundTrack) return null

        return foundTrack.id
    }

    async #dispatchLikedTracks() {
        const { id: songId, trackId, type = 'track' } = await currentData.readTrack()

        let likedTrackId = trackId

        if (type == 'album') {
            likedTrackId = await this.#dispatchGetTrackIdFromAlbum({ songId, albumId: trackId })
        }

        if (!likedTrackId) return false

        const method = (await this.#isHeartIconHighlighted(likedTrackId)) ? 'DELETE' : 'PUT'

        await this._dispatcher.sendEvent({
            eventType: 'tracks.update',
            detail: { key: 'tracks.update', values: { id: likedTrackId, method } }
        })

        return { highlight: method == 'PUT', id: likedTrackId }
    }

    async #handleClick() {
        const { highlight = false, id = null } = await this.#dispatchLikedTracks()
        this.highlightIcon(highlight, id)
    }

    get #nowPlayingButton() {
        return document.querySelector(
            'div[data-testid="now-playing-widget"] > div > button[data-encore-id="buttonTertiary"]'
        )
    }

    get #isSpotifyHighlighted() {
        const button = this.#nowPlayingButton
        if (!button) return false

        return JSON.parse(button.getAttribute('aria-checked'))
    }

    async #isHeartIconHighlighted(id) {
        const trackState = store.checkInCollection(id)
        if (trackState !== null) return trackState

        // If Spotify does not mark is 'curated', then it's not in ANY of user's playlists
        if (!this.#isSpotifyHighlighted) {
            store.saveInCollection({ id, saved: false })
            return false
        }

        return this.#heartIcon.firstElementChild.getAttribute('fill') != 'unset'
    }

    async #getIsTrackLiked(id) {
        if (!id) return false

        const trackState = store.checkInCollection(id)
        if (trackState !== null) return trackState

        const response = await this.#dispatchIsInCollection(id)

        const saved = response?.data?.at(0)
        store.saveInCollection({ id, saved })
        return saved
    }

    async highlightIcon(highlight, id) {
        let { trackId, type = 'track', id: songId } = await currentData.readTrack()

        let shouldUpdate = false

        if (typeof highlight !== 'undefined') {
            shouldUpdate = highlight
        } else {
            if (type == 'album') {
                trackId = await this.#dispatchGetTrackIdFromAlbum({ songId, albumId: trackId })
            }
            if (!trackId) return

            shouldUpdate = await this.#getIsTrackLiked(trackId)
        }

        highlightIconTimer({
            fill: true,
            highlight: shouldUpdate,
            selector: '#chorus-heart > svg'
        })

        this.#updateIconLabel(shouldUpdate)
        store.saveInCollection({ id: id ?? trackId, saved: shouldUpdate })
        this.#highlightInTracklist({ highlight: shouldUpdate, trackId: id ?? trackId })
    }

    #highlightInTracklist({ highlight, trackId }) {
        const anchors = document.querySelectorAll(
            `a[data-testid="internal-track-link"][href="/track/${trackId}"]`
        )
        if (!anchors?.length) return

        anchors.forEach((anchor) => {
            const trackRow = anchor?.parentElement?.parentElement?.parentElement
            if (!trackRow) return

            const heartIcon = trackRow.querySelector('button[role="heart"]')
            if (!heartIcon) return

            const svg = heartIcon.querySelector('svg')
            if (!svg) return

            heartIcon.style.visibility = highlight ? 'visible' : 'hidden'

            heartIcon.setAttribute('aria-label', `${highlight ? 'Remove from' : 'Save to'} Liked`)
            svg.style.fill = highlight ? '#1ed760' : 'transparent'
            svg.style.stroke = highlight ? '#1ed760' : 'currentColor'
        })
    }

    #updateIconLabel(highlight) {
        const text = `${highlight ? 'Remove from' : 'Save to'} Liked`
        this.#heartIcon?.setAttribute('aria-label', text)
        updateToolTip(this.#heartIcon)
    }
}
