import { mount } from 'svelte'
import HeartButton from '$lib/components/HeartButton.svelte'
import { TrackListIcon } from './tracklist-icon'

import { getTrackId, trackSongInfo } from '$lib/utils/song'
// import Dispatcher from '$lib/events/dispatcher'
// import { currentData } from '$lib/data/current'
// import { highlightIconTimer } from '$lib/utils/highlight'
// import { updateToolTip } from '$lib/utils/tooltip'

export class HeartIcon extends TrackListIcon {
    constructor() {
        super({
            key: 'isLiked',
            selector: 'button[role="heart"]'
        })
        // this._dispatcher = new Dispatcher()
    }

    get isOnLikedSongsPage() {
        return location.pathname == '/collection/tracks'
    }

    isLiked(row: HTMLElement) {
        if (this.isOnLikedSongsPage) return true

        if (row.getAttribute('data-testid') != 'tracklist-row') return false

        // const { trackId = null } = getTrackId(row)
        // if (!trackId) return false

        // return !!this._store.checkInCollection(trackId)
    }

    async toggleTrackLiked(row: HTMLElement) {
        const { trackId = null } = getTrackId(row)
        if (!trackId) return

        const isLiked = this.isOnLikedSongsPage ? true : this.isLiked(row)
        const method = isLiked ? 'DELETE' : 'PUT'

        // const { state } = await this._dispatcher.sendEvent({
        //     eventType: 'tracks.update',
        //     detail: { key: 'tracks.update', values: { id: trackId, method } }
        // })

        // if (state == 'error') return

        // const saved = method == 'PUT'
        // this._store.saveInCollection({ id: trackId, saved })

        // const icon = row.querySelector(this._selector)
        // this.animate(icon, saved)
        // updateToolTip(icon)

        // const { id: songId } = trackSongInfo(row)
        // await this.#updateCurrentTrack({ songId, highlight: saved })
    }

    async updateCurrentTrack({ songId, highlight }: { songId: string; highlight: boolean }) {
        // const { id } = await currentData.readTrack()
        // if (id !== songId) return
        // highlightIconTimer({
        //     highlight,
        //     fill: true,
        //     selector: '#chorus-heart > svg'
        // })
        // const heartIcon = document.querySelector('#chorus-heart')
        // const text = `${highlight ? 'Remove from' : 'Save to'} Liked`
        // heartIcon?.setAttribute('aria-label', text)
    }

    setInitialState(row: HTMLElement) {
        // const icon = row.querySelector(this._selector)
        // this.animate(icon)
    }

    burn({ icon, burn }: { icon: HTMLElement; burn: boolean }) {
        const svg = icon.querySelector('svg') as SVGElement

        if (burn) {
            icon.style.visibility = 'visible'
        }

        icon.setAttribute('aria-label', `${burn ? 'Remove from' : 'Save to'} Liked`)
        svg.style.fill = burn ? '#1ed760' : 'transparent'
        svg.style.stroke = burn ? '#1ed760' : 'currentColor'
    }

    glow({ icon, glow }: { icon: HTMLElement; glow: boolean }) {
        const svg = icon.querySelector('svg') as SVGElement

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

    animate(icon: HTMLElement, heart?: boolean) {
        if (!icon?.parentElement) return

        const isLiked = heart ?? this.isLiked(icon?.parentElement?.parentElement as HTMLElement)

        this.burn({ icon, burn: isLiked })
        this.glow({ icon, glow: isLiked })
    }

    setUI(row: HTMLElement) {
        if (!row) return

        if (!this.getIcon(row)) {
            const heartIcon = row.querySelector('button[data-encore-id="buttonTertiary"]')
            if (!heartIcon) return
            console.log({ heartIcon })

            const parentElement = heartIcon?.parentElement
            const div = document.createElement('div')
            parentElement?.insertBefore(div, heartIcon)
            mount(HeartButton, {
                target: div
            })
        }

        const icon = this.getIcon(row) as HTMLElement

        if (icon) {
            icon.style.display = 'flex'
        }
    }
}
