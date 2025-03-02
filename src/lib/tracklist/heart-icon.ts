import { mount } from 'svelte'
import { TrackListIcon } from './tracklist-icon'
import type { SimpleTrack } from '$lib/stores/data/cache'
import TrackListHeartButton from '$lib/components/TrackListHeartButton.svelte'

export class HeartIcon extends TrackListIcon {
    constructor() {
        super('button[role="heart"]')
    }

    setUI({ row, track }: { row: Element; track: SimpleTrack }) {
        if (!row) return
        if (this.getIcon(row)) return

        const heartIcon = row.querySelector('button[data-encore-id="buttonTertiary"]')
        if (!heartIcon) return

        const parentElement = heartIcon?.parentElement
        const div = document.createElement('div')
        parentElement?.insertBefore(div, heartIcon)
        mount(TrackListHeartButton, { target: div, props: { track } })
    }
}
