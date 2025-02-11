export default class TrackListObserver {
    constructor(trackList) {
        this._observer = null
        this._isHidden = true
        this._trackList = trackList
    }

    observe() {
        this.#showUI()
        this._trackList.setTrackListClickEvent()

        const target = document.querySelector('main')
        this._observer = new MutationObserver(this.#mutationHandler)
        this._observer.observe(target, { subtree: true, childList: true })
    }

    #isMainView(mutation) {
        if (mutation.target.localName !== 'div') return false
        if (!mutation.addedNodes.length) return false

        const addedNode = Array.from(mutation.addedNodes)?.at(0)
        if (addedNode.localName != 'div') return false

        const classList = Array.from(mutation.target.classList)
        if (!classList.includes('main-view-container__mh-footer-container')) return false

        return true
    }

    #isMoreLoaded(mutation) {
        const { target } = mutation
        return target?.role == 'presentation' && mutation.addedNodes.length >= 1
    }

    #mutationHandler = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (this.#isMainView(mutation) || this.#isMoreLoaded(mutation)) {
                clearTimeout(this._observerTimeout)

                this._observerTimeout = setTimeout(() => {
                    this._trackList.setTrackListClickEvent()
                    this._isHidden
                        ? this._trackList.removeBlocking()
                        : this._trackList.setUpBlocking()
                }, 250)
            }
        }
    }

    #hideUI() {
        this._isHidden = true
        this._trackList.removeBlocking()
        this._trackList.showPlusCircles()
    }

    #showUI() {
        this._isHidden = false
        this._trackList.setUpBlocking()
    }

    disconnect() {
        this.#hideUI()

        this._observer?.disconnect()
        this._observer = null
    }
}
