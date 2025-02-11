import { store } from '../stores/data.js'
import { currentData } from '../data/current.js'
import { createControls } from '../components/controls.js'
import { SETTINGS_ICON, NOW_PLAYING_SKIP_ICON, createIcon } from '../components/icons/icon.js'

import { currentSongInfo } from '../utils/song.js'
import { parseNodeString } from '../utils/parser.js'
import { highlightElement } from '../utils/highlight.js'

export default class NowPlayingIcons {
    constructor({ snip, chorus }) {
        this.snip = snip
        this.chorus = chorus
    }

    placeIcons() {
        this.#placeIcons()
    }

    clearIcons() {
        document.getElementById('chorus')?.remove()
    }

    // TODO: Icon should not be concerned with creating the main UI
    #createRootContainer() {
        return `
            <div id="chorus">
                ${this.#createSettingsIcon()}
                ${this.#createSkipIcon()}
                <div id="chorus-main" style="display: none">
                    ${createControls()}
                </div>
            </div>
        `
    }

    #placeIcons() {
        const root = this.#createRootContainer()

        const interval = setInterval(() => {
            const iconListContainer = document.querySelector('[data-testid="now-playing-widget"]')

            if (!iconListContainer) return

            const rootEl = parseNodeString(root)
            iconListContainer.appendChild(rootEl)

            this.#setIconListeners()
            clearInterval(interval)
        }, 50)
    }

    #createSettingsIcon() {
        return createIcon(SETTINGS_ICON)
    }

    #createSkipIcon() {
        return createIcon(NOW_PLAYING_SKIP_ICON)
    }

    #showModal() {
        this.chorus.show()
        this.snip.init()
        this.snip.updateView()
    }

    async #hideModal() {
        await this.chorus.hide()
    }

    #setIconListeners() {
        const settingsIcon = document.getElementById('chorus-icon')
        settingsIcon?.addEventListener('click', async (e) => {
            e.preventDefault()
            this.chorus.isShowing ? await this.#hideModal() : this.#showModal()
        })

        const skipIcon = document.getElementById('chorus-skip')
        skipIcon.addEventListener('click', async () => this.#handleSkipTrack())
    }

    #highlightTrackListBlock(songStateData) {
        if (!this.#trackRows) return

        const title = currentSongInfo()?.id?.split(' by ')?.at(0) || ''
        const context = this.#trackRows.find(
            (row) =>
                row.querySelector('[data-testid="internal-track-link"] div')?.textContent == title
        )
        if (!context) return

        highlightElement({ songStateData, context, property: 'fill', selector: 'svg[role="skip"]' })

        const icon = context.querySelector('svg[role="skip"]')
        if (!icon) return

        icon.style.visibility = 'visible'
    }

    get #trackRows() {
        const trackRows = document.querySelectorAll('[data-testid="tracklist-row"]')
        return trackRows?.length > 0 ? Array.from(trackRows) : undefined
    }

    async #handleSkipTrack() {
        const songInfo = await currentData.readTrack()
        if (!songInfo) return

        const updatedValues = await store.saveTrack({
            id: currentSongInfo().id,
            value: { ...songInfo, isSkipped: !songInfo.isSkipped }
        })

        if (updatedValues.isSkipped) {
            this.#highlightTrackListBlock(updatedValues)
            document.querySelector('[data-testid="control-button-skip-forward"]')?.click()
        }
    }
}
