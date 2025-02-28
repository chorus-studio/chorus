import { get } from 'svelte/store'
import { mediaStore } from '$lib/stores/media'
import { nowPlaying } from '$lib/stores/now-playing'

export class PlaybackObserver {
    private observer: MutationObserver | null = null

    observe() {
        const target = document.querySelector('[data-testid="playback-position"]')
        if (!target) return

        this.observer = new MutationObserver(this.handleMutation)
        this.observer.observe(target, { characterData: true, subtree: true })
        this.removeAddToPlaylistButton()
    }

    private async checkForDJ() {
        const target = document.querySelector('[data-testid="control-button-npv"]')
        if (!target) return

        const djUI = target.previousElementSibling as HTMLElement
        const media = get(mediaStore)
        if ((!djUI && media.dj) || (djUI && !media.dj)) {
            await mediaStore.updateState()
        }
    }

    private removeAddToPlaylistButton() {
        const addToPlaylistButton = document.querySelector(
            '[data-testid="now-playing-widget"] > div > button[data-encore-id="buttonTertiary"]'
        ) as HTMLButtonElement

        if (!addToPlaylistButton) return

        const visibility = addToPlaylistButton.style.visibility
        if (visibility === 'hidden') return

        const parent = addToPlaylistButton?.parentElement
        if (parent) {
            parent.style.margin = '0'
            parent.style.gap = '0'
        }
        if (addToPlaylistButton) {
            addToPlaylistButton.style.visibility = 'hidden'
            addToPlaylistButton.style.width = '0'
        }
    }

    private handleMutation = async (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            if (mutation.type !== 'characterData') return
            const newValue = mutation.target.nodeValue
            if (!newValue) return

            await this.checkForDJ()
            await nowPlaying.updateNowPlaying()
            this.removeAddToPlaylistButton()
        }
    }

    disconnect() {
        this.observer?.disconnect()
        this.observer = null
    }
}
