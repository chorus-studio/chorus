import { mount } from 'svelte'
import { TrackListIcon } from './tracklist-icon'
import type { SimpleTrack } from '$lib/stores/data/cache'
import TrackListSkipButton from '$lib/components/TrackListSkipButton.svelte'

export class SkipIcon extends TrackListIcon {
    constructor() {
        super('button[role="block"]')
    }

    setUI({ row, track }: { row: Element; track: SimpleTrack }) {
        if (!row) return

        if (this.getIcon(row)) return

        const heartIcon = row.querySelector('button[data-encore-id="buttonTertiary"]')
        if (!heartIcon) return

        const parentElement = heartIcon?.parentElement
        const div = document.createElement('div')
        parentElement?.insertBefore(div, heartIcon)
        mount(TrackListSkipButton, {
            target: div,
            props: { track }
        })
    }
}
