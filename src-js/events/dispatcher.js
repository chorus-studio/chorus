export default class Dispatcher {
    constructor() {
        this.#initListener()
    }

    #initListener() {
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return

            if (event?.data?.type === 'FROM_CONTENT_SCRIPT') {
                document.dispatchEvent(
                    new CustomEvent(event.data.requestType, { detail: event.data.payload })
                )
            }
        })
    }

    sendEvent({ eventType, detail = {} }) {
        window.postMessage(
            {
                type: 'FROM_PAGE_SCRIPT',
                requestType: eventType,
                payload: detail
            },
            window.location.origin
        )

        return new Promise((resolve) => {
            const resultListener = (e) => {
                resolve(e.detail)
                document.removeEventListener(`${eventType}.response`, resultListener)
            }

            document.addEventListener(`${eventType}.response`, resultListener)
        })
    }
}
