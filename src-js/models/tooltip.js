import { parseNodeString } from '../utils/parser.js'
import { updateToolTip } from '../utils/tooltip.js'

export default class ToolTip {
    placeUI() {
        this.#setupToolTip()
    }

    get #toolTip() {
        return document.getElementById('tooltip')
    }

    #setupToolTip() {
        if (this.#toolTip) return

        const toolTipEl = `<div id="tooltip" class="tooltip" />`
        const toolTip = parseNodeString(toolTipEl)
        document.body.appendChild(toolTip)

        this.#setupNowPlayingListeners()
    }

    setupTrackListListeners(row) {
        const buttons = row.querySelectorAll('button[role]')
        buttons.forEach((button) => {
            button.addEventListener('mouseenter', this.#showToolTip)
            button.addEventListener('mouseleave', this.#hideToolTip)
        })
    }

    #setupNowPlayingListeners() {
        this._interval = setInterval(() => {
            if (!this._interval) return

            const chorusButtons = document.querySelectorAll('#chorus > button[role]')
            const generalControls = document.querySelectorAll(
                '[data-testid="general-controls"] > div > button[id]'
            )
            if (chorusButtons.length !== 3 || generalControls.length !== 3) return
            ;[...chorusButtons, ...generalControls].forEach((button) => {
                button.addEventListener('mouseenter', this.#showToolTip)
                button.addEventListener('mouseleave', this.#hideToolTip)
            })

            clearInterval(this._interval)
            this._interval = null
        }, 25)
    }

    #isChorusUI(target) {
        const role = target.getAttribute('role')
        if (!role) return false

        return ['heart', 'settings', 'skip', 'ff', 'rw', 'loop'].includes(role)
    }

    #showToolTip = (event) => {
        if (!this.#isChorusUI(event.target)) return

        this.#toolTip.style.display = 'inline-block'
        updateToolTip(event.target)
    }

    #hideToolTip = () => {
        if (!this.#toolTip) return
        this.#toolTip.style.display = 'none'
    }

    removeUI() {
        this.#toolTip?.removeEventListener('mouseenter', this.#showToolTip)
        this.#toolTip?.removeEventListener('mouseleave', this.#hideToolTip)
        this.#toolTip?.remove()
    }
}
