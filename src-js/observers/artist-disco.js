import { loadArtistDiscoUI } from '../components/artist-disco.js'

export default class ArtistDiscoObserver {
    constructor() {
        this._observer = null
    }

    observe() {
        if (this.#showButton) loadArtistDiscoUI()

        const target = document.querySelector('main')
        this._observer = new MutationObserver(this.#mutationHandler)
        this._observer.observe(target, { childList: true, attributeFilter: ['data-testid'] })
    }

    get #artistDiscoButton() {
        return document.getElementById('artist-disco')
    }

    get #uiAdded() {
        return !!this.#artistDiscoButton
    }

    get #showButton() {
        if (!location.pathname.startsWith('/artist')) return false
        if (this.#uiAdded) return false
        return true
    }

    #mutationHandler = () => {
        if (this.#showButton) loadArtistDiscoUI()
        if (!this.#showButton && this.#uiAdded) this.#artistDiscoButton?.remove()
    }

    disconnect() {
        this._observer?.disconnect()
        this.#artistDiscoButton?.remove()
        this._observer = null
    }
}
