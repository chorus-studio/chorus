import { mount } from 'svelte'
import { TrackListIcon } from './tracklist-icon'
import TrackListSkipButton from '$lib/components/TrackListSkipButton.svelte'
import { trackSongInfo } from '$lib/utils/song'

export class SkipIcon extends TrackListIcon {
    constructor() {
        super({
            key: 'isSkipped',
            selector: 'button[role="skip"]'
        })
    }

    setInitialState(row: HTMLElement) {
        super.setInitialState(row)
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
        mount(TrackListSkipButton, {
            target: div,
            props: { trackInfo }
        })
    }
}
