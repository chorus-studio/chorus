import { TrackList } from '$lib/tracklist'

export class TracklistObserver {
    private observer: MutationObserver | null = null
    private timeout: NodeJS.Timeout | null = null
    private trackList: TrackList

    constructor() {
        this.trackList = new TrackList()
    }

    observe() {
        const target = document.querySelector('main')
        if (!target) return

        this.observer = new MutationObserver(this.handleMutation)
        this.observer.observe(target, { childList: true, subtree: true })
    }

    private isMainView(mutation: MutationRecord) {
        const target = mutation.target as HTMLElement
        if (target.localName !== 'div') return false
        if (!mutation.addedNodes.length) return false

        const addedNode = Array.from(mutation.addedNodes)?.at(0) as HTMLElement
        if (addedNode?.localName != 'div') return false

        const classList = Array.from(target.classList)
        if (!classList.includes('main-view-container__mh-footer-container')) return false

        return true
    }

    private isMoreLoaded(mutation: MutationRecord) {
        const targetElement = mutation.target as HTMLElement
        return targetElement?.role == 'presentation' && mutation.addedNodes.length >= 1
    }

    private handleMutation = (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            if (this.isMainView(mutation) || this.isMoreLoaded(mutation)) {
                if (this.timeout) clearTimeout(this.timeout)

                this.timeout = setTimeout(() => {
                    // this.observer?.disconnect()

                    this.trackList.setUpBlocking()
                }, 250)
            }
        }
    }

    disconnect() {
        this.observer?.disconnect()
    }
}
