import { TrackList } from '$lib/tracklist'

export class TracklistObserver {
    private trackList: TrackList
    private observer: MutationObserver | null = null
    private timeout: NodeJS.Timeout | null = null

    constructor() {
        this.trackList = new TrackList()
    }

    observe() {
        const target = document.querySelector('main')
        if (!target) return

        // Defensive: a singleton observer may be re-observed across App remounts.
        this.observer?.disconnect()
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
        let shouldUpdate = false
        
        // Batch check all mutations to avoid multiple timeout resets
        for (const mutation of mutations) {
            if (this.isMainView(mutation) || this.isMoreLoaded(mutation)) {
                shouldUpdate = true
                break // Exit early once we find one relevant mutation
            }
        }
        
        if (shouldUpdate) {
            if (this.timeout) clearTimeout(this.timeout)
            this.timeout = setTimeout(() => {
                this.trackList.setUpBlocking()
            }, 200)
        }
    }

    // Lightweight stop: halt observation only. Safe to run on every App remount
    // (e.g. when reconcile re-mounts the App after Spotify swaps the widget) — the
    // per-row buttons are intentionally left in place so they don't churn.
    disconnect() {
        this.observer?.disconnect()
        this.observer = null

        if (this.timeout) {
            clearTimeout(this.timeout)
            this.timeout = null
        }
    }

    // Full teardown for master-OFF: stop observing AND remove the per-row block/heart
    // buttons grafted into Spotify's rows, returning the tracklist to vanilla.
    teardown() {
        this.disconnect()
        this.trackList.teardown()
    }
}

// Singleton so master-OFF (removeChorusUI) can fully tear down the per-row buttons,
// while the App lifecycle only stops/restarts observation across remounts.
export const tracklistObserver = new TracklistObserver()
