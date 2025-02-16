import { get, writable } from 'svelte/store'

type Track = {
    id: string
    title: string
    artist: string
}

function createTrackListStore() {
    let timeout: NodeJS.Timeout | null = null
    let observer: MutationObserver | null = null
    const store = writable<{ visible: true; tracks: Track[] }>({ visible: true, tracks: [] })
    const { subscribe, set } = store

    function observe() {
        const target = document.querySelector('main')
        if (!target) return

        observer = new MutationObserver(handleMutation)
        observer.observe(target, { childList: true, subtree: true })
    }

    function disconnect() {
        observer?.disconnect()
        observer = null
    }

    function isMainView(mutation: MutationRecord) {
        if ((mutation.target as HTMLElement).localName !== 'div') return false
        if (!mutation.addedNodes.length) return false

        const addedNode = Array.from(mutation.addedNodes)?.at(0) as HTMLElement
        if (addedNode?.localName != 'div') return false

        const classList = Array.from((mutation.target as HTMLElement).classList)
        if (!classList.includes('main-view-container__mh-footer-container')) return false

        return true
    }

    function areMoreTracksLoaded(mutation: MutationRecord) {
        const { target } = mutation
        return (target as HTMLElement)?.role == 'presentation' && mutation?.addedNodes?.length >= 1
    }

    function handleMutation(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            if (areMoreTracksLoaded(mutation) || isMainView(mutation)) {
                if (timeout) clearTimeout(timeout)

                timeout = setTimeout(() => {
                    // TODO: render tracks icons
                }, 250)
            }
        }
    }
}

export const trackList = createTrackListStore()
