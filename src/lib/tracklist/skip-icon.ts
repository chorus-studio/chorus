import { mount } from 'svelte'
import { TrackListIcon } from './tracklist-icon'
import SkipButton from '$lib/components/SkipButton.svelte'

export class SkipIcon extends TrackListIcon {
    constructor() {
        super({
            // store,
            key: 'isSkipped',
            selector: 'button[role="skip"]'
        })
    }

    setInitialState(row: HTMLElement) {
        super.setInitialState(row)
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
            mount(SkipButton, {
                target: div
            })
        }

        const icon = this.getIcon(row) as HTMLElement

        if (icon) {
            icon.style.display = 'flex'
        }
    }
}
