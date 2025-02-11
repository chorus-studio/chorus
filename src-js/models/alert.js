import { createAlert } from '../components/alert.js'
import { parseNodeString } from '../utils/parser.js'

export default class Alert {
    #craftMessageNode({ message, link, linkMessage }) {
        const messageHTML = `
            <div style="display:flex;flex-direction:column;">
                <p>${message ?? 'Snip copied to clipboard.'}</p>
                ${
                    link
                        ? `<p><a style="text-decoration-line:underline" href="${link}">
                          ${linkMessage ?? 'Go To Playlist.'}
                      </a></p>`
                        : ''
                }
            </div>
        `
        return parseNodeString(messageHTML)
    }

    displayAlert({ type = 'success', message, link, linkMessage, duration = 3000 } = {}) {
        this.#setupAlert()
        const alertMessage = this.#chorusAlert.querySelector('[id="chorus-alert-message"]')

        this.#chorusAlert.style.backgroundColor = type == 'success' ? 'forestgreen' : 'red'

        const messageNode = this.#craftMessageNode({ message, link, linkMessage })
        alertMessage.replaceChildren(messageNode)

        this.#chorusAlert.style.display = 'flex'
        setTimeout(() => (this.#chorusAlert.style.display = 'none'), duration)
    }

    #handleAlert(target) {
        const container = target.parentElement
        container.style.display = 'none'
    }

    get #chorusAlert() {
        return document.getElementById('chorus-alert')
    }

    #setupAlert() {
        if (this.#chorusAlert) return

        const alertEl = parseNodeString(createAlert())
        document.body.appendChild(alertEl)

        const closeAlertButton = document.getElementById('chorus-alert-close-button')
        closeAlertButton?.addEventListener('click', () => {
            this.#handleAlert(closeAlertButton)
        })
    }
}
