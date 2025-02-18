import { nowPlaying } from '$lib/stores/now-playing'

export class PlaybackObserver {
    private observer: MutationObserver | null = null

    observe() {
        const target = document.querySelector('[data-testid="playback-position"]')
        if (!target) return

        this.observer = new MutationObserver(this.handleMutation)
        this.observer.observe(target, { characterData: true, subtree: true })
    }

    private async handleMutation(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            if (mutation.type !== 'characterData') return
            const newValue = mutation.target.nodeValue
            if (!newValue) return

            await nowPlaying.updateNowPlaying()
        }
    }

    disconnect() {
        this.observer?.disconnect()
        this.observer = null
    }
}
