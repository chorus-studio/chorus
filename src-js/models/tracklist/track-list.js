import SkipIcon from './skip-icon.js'
import SnipIcon from './snip-icon.js'
import HeartIcon from './heart-icon.js'

import ToolTip from '../tooltip.js'
import Chorus from '../chorus.js'
import TrackSnip from '../snip/track-snip.js'
import Dispatcher from '../../events/dispatcher.js'

import { store } from '../../stores/data.js'
import { getTrackId, trackSongInfo } from '../../utils/song.js'
import { updateToolTip } from '../../utils/tooltip.js'

export default class TrackList {
    constructor(songTracker) {
        this._dispatcher = new Dispatcher()
        this._chorus = new Chorus(songTracker)
        this._skipIcon = new SkipIcon(store)
        this._heartIcon = new HeartIcon(store)
        this._snipIcon = new SnipIcon(store)
        this._trackSnip = new TrackSnip(store)
        this._toolTip = new ToolTip()

        this._visibleEvents = ['mouseenter']
        this._events = ['mouseenter', 'mouseleave']

        this._icons = [
            this._heartIcon,
            this._skipIcon // this._snipIcon
        ]
        this._previousRowNum = null
    }

    get #trackRows() {
        const trackRows = document.querySelectorAll('[data-testid="tracklist-row"]')
        return trackRows?.length > 0 ? Array.from(trackRows) : undefined
    }

    get #trackIdsToCheck() {
        if (!this.#trackRows.length) return []

        const trackIds = new Set(this.#trackRows.map((row) => getTrackId(row).trackId))
        const collectionTrackIds = new Set(store.collectionTrackIds)

        const trackIdsToCheckIfLiked = [...trackIds.difference(collectionTrackIds)]
        return trackIdsToCheckIfLiked
    }

    get #plusCircles() {
        const plusCircleButtons = document.querySelectorAll(
            '[role="presentation"] > div > button[data-encore-id="buttonTertiary"][aria-checked]'
        )
        if (!plusCircleButtons.length) return []
        return Array.from(plusCircleButtons)
    }

    #updateButtonStyles({ button, show = false }) {
        button.style.padding = show ? '12px' : 0
        button.style.width = show ? '16px' : 0
        button.style.visibility = show ? 'visible' : 'hidden'
        button.style.marginRight = show ? 12 : 0
    }

    showPlusCircles() {
        this.#plusCircles
            .filter((button) => button.style.visibility == 'hidden')
            .forEach((button) => this.#updateButtonStyles({ button, show: true }))
    }

    #hidePlusCircles() {
        this.#plusCircles.forEach((button) => this.#updateButtonStyles({ button }))
    }

    #hidePlusCircle(row) {
        const button = row.querySelector('button[role="buttonTertiary"]')
        if (!button) return
        this.#updateButtonStyles(button)
    }

    async #updateCollectionLikedTracks(ids) {
        const { state, data } = await this._dispatcher.sendEvent({
            eventType: 'tracks.liked',
            detail: { key: 'tracks.liked', values: { ids: ids.join(',') } }
        })

        if (state !== 'completed') return

        const collection = ids.reduce((obj, id, index) => {
            obj[id] = data[index]
            return obj
        }, {})

        store.mergetoCollection(collection)
    }

    get #isOnLikedSongsPage() {
        return location.pathname == '/collection/tracks'
    }

    async setUpBlocking() {
        if (!this.#trackRows?.length) return
        this.#hidePlusCircles()

        const trackIds = this.#trackIdsToCheck

        if (trackIds.length && !this.#isOnLikedSongsPage) {
            await this.#updateCollectionLikedTracks(trackIds)
        }

        this.#toggleBlockDisplay(false)
        this.#setRowEvents()
    }

    removeBlocking() {
        if (!this.#trackRows?.length) return

        this.#toggleBlockDisplay(true)
        this.showPlusCircles()
    }

    #toggleBlockDisplay(hide) {
        const blockIcons = this.#trackRows
            .map((row) =>
                Array.from(
                    row.querySelectorAll([
                        //'button[role="snip"]',
                        'button[role="heart"]',
                        'button[role="skip"]'
                    ])
                )
            )
            .flat()

        blockIcons?.forEach((icon) => {
            if (!icon) return

            icon.style.display = hide ? 'none' : 'flex'
        })
    }

    #getRowIcons(row) {
        return Array.from(
            row.querySelectorAll('button[role="snip"], button[role="skip"], button[role="heart"]')
        )
    }

    #setMouseEvents(row) {
        const song = trackSongInfo(row)
        if (!song) return

        this.#hidePlusCircle(row)

        this._events.forEach((event) => {
            row?.addEventListener(event, async () => {
                const snipInfo = await this._snipIcon.getTrack(song.id)
                const icons = this.#getRowIcons(row)
                const keys = { snip: 'isSnip', skip: 'isSkipped' }

                icons.forEach((icon) => {
                    icon.style.visibility = this._visibleEvents.includes(event)
                        ? 'visible'
                        : 'hidden'

                    const role = icon.getAttribute('role')

                    if (role == 'heart') {
                        this._heartIcon.animate(icon)
                    } else {
                        const display = snipInfo?.[keys[role]] ?? false

                        this._skipIcon._burn({ icon, burn: display })
                        this._skipIcon._glow({ icon, glow: display })
                    }
                })
            })
        })
    }

    #handleClick = async (e) => {
        const target = e.target
        const role = target?.getAttribute('role')

        if (['snip', 'skip', 'heart'].includes(role)) {
            let row = target.parentElement
            do {
                row = row.parentElement
            } while (row.dataset.testid != 'tracklist-row')

            const currentIndex = row.parentElement.getAttribute('aria-row-index')

            if (role == 'snip') {
                if (!this._previousRowNum || currentIndex != this._previousRowNum) {
                    this._chorus.show()
                    await this._trackSnip.init(row)
                } else if (currentIndex == this._previousRowNum) {
                    await this._chorus.toggle()
                }

                const icon = row.querySelector('button[role="snip"]')
                this._snipIcon._animate(icon)
                this._previousRowNum = currentIndex
            } else if (role == 'skip') {
                const icon = row.querySelector('button[role="skip"]')
                await this._skipIcon._saveTrack(row)
                this._skipIcon._animate(icon)
                updateToolTip(icon)
            } else {
                const icon = row.querySelector('button[role="heart"]')
                await this._heartIcon.toggleTrackLiked(row)
                this._heartIcon.animate(icon)
            }
        }
    }

    setTrackListClickEvent() {
        const trackLists = Array.from(
            document.querySelectorAll([
                '[data-testid="track-list"]',
                '[data-testid="playlist-tracklist"]'
            ])
        )
        const containers = trackLists?.map((trackList) =>
            trackList.querySelector('[data-testid="top-sentinel"] + [role="presentation"]')
        )

        if (!containers?.length) return

        this._previousRowNum = null

        containers.forEach((container) => {
            container?.removeEventListener('click', this.#handleClick)
            container?.addEventListener('click', this.#handleClick)
        })
    }

    #setRowEvents() {
        this.#trackRows.forEach((row) => {
            this._icons.forEach((icon) => {
                icon.setUI(row)
                icon.setInitialState(row)
            })
            this.#setMouseEvents(row)
            this._toolTip.setupTrackListListeners(row)
        })
    }
}
