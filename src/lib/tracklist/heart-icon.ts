import { mount } from 'svelte'
import { trackSongInfo } from '$lib/utils/song'
import { TrackListIcon } from './tracklist-icon'
import TrackListHeartButton from '$lib/components/TrackListHeartButton.svelte'

export class HeartIcon extends TrackListIcon {
    constructor() {
        super({ key: 'isLiked', selector: 'button[role="heart"]' })
    }

    setUI(row: HTMLElement) {
        if (!row) return
        if (this.getIcon(row)) return

        const heartIcon = row.querySelector('button[data-encore-id="buttonTertiary"]')
        if (!heartIcon) return

        const parentElement = heartIcon?.parentElement
        const div = document.createElement('div')
        parentElement?.insertBefore(div, heartIcon)
        const trackInfo = trackSongInfo(row)
        mount(TrackListHeartButton, { target: div, props: { trackInfo } })
    }
}
