import Queue from '../models/queue'

export default class QueueObserver {
    constructor() {
        this._observer = null
        this._interval = null
        this._queue = new Queue()
    }

    observe() {
        this._interval = setInterval(() => {
            if (this._observer) return

            const target = document.querySelector('aside[aria-label="Queue"]')

            if (!target) {
                this._observer?.disconnect()
                this._observer = null
                return
            }

            this._observer = new MutationObserver(this.#mutationHandler)
            this._observer.observe(target, { childList: true, subtree: true })
        }, 1000)
    }

    #mutationHandler = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (!this.#isAsideQueueView(mutation)) return

            if (this._timeout) clearTimeout(this._timeout)
            this._timeout = setTimeout(async () => this._queue.refreshQueue(), 1500)
        }
    }

    #isAsideQueueView(mutation) {
        const target = mutation.target
        if (target?.localName !== 'ul') return false

        const listLabels = ['Next in queue', 'Next up', 'Now playing']
        const attribute = target.getAttribute('aria-label')
        return listLabels.includes(attribute)
    }

    disconnect() {
        this._observer?.disconnect()
        this._observer = null
        if (this._interval) clearInterval(this._interval)
    }
}
