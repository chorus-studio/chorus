import { mount, unmount } from 'svelte'

import { setTheme } from '$lib/utils/theming'
import type { SettingsState } from '$lib/stores/settings'

import '../app.css'
import App from '../App.svelte'
import Alert from '$lib/components/Alert.svelte'
import LoopButton from '$lib/components/LoopButton.svelte'
import SeekButton from '$lib/components/SeekButton.svelte'
import NewReleasesIcon from '$lib/components/NewReleasesIcon.svelte'
import ChorusConfigDialog from '$lib/components/ChorusConfigDialog.svelte'

async function injectChorusUI(ctx) {
    await injectScript('/router.js')
    await injectScript('/media-override.js')

    const settings = await storage.getItem<SettingsState>('local:chorus_settings')
    const theme = settings?.ui?.theme ? settings?.theme?.name : 'spotify'
    await setTheme(theme)

    const ui = createIntegratedUi(ctx, {
        position: 'inline',
        anchor: '[data-testid="now-playing-widget"]',
        onMount: (container) => {
            const chorusUI = document.getElementById('chorus-ui')
            if (chorusUI) return

            const skipBack = document.querySelector('[data-testid="control-button-skip-back"]')
            const skipForward = document.querySelector(
                '[data-testid="control-button-skip-forward"]'
            )
            mount(App, { target: container })
            const body = document.querySelector('body')
            if (body) mount(Alert, { target: body })

            if (skipBack) {
                const seekBack = document.querySelector('#seek-player-rw-button')
                if (!seekBack) {
                    const div = document.createElement('div')
                    skipBack.parentElement?.insertBefore(div, skipBack)
                    mount(SeekButton, { target: div, props: { role: 'seek-backward' } })
                }
            }
            if (!skipForward) return

            const seekForward = document.querySelector('#seek-player-ff-button')
            const loopButton = document.querySelector('#loop-button')
            if (!(!seekForward && !loopButton)) return

            const forwardDiv = document.createElement('div')
            const loopDiv = document.createElement('div')
            const parentElement = skipForward.parentElement
            if (!parentElement?.lastElementChild) return

            parentElement?.insertBefore(forwardDiv, skipForward.nextSibling)
            parentElement?.insertBefore(loopDiv, parentElement?.lastElementChild?.nextSibling)
            mount(SeekButton, {
                target: forwardDiv,
                props: { role: 'seek-forward' }
            })
            mount(LoopButton, { target: loopDiv })

            const newFeedButton = document.querySelector('[data-testid="whats-new-feed-button"]')
            if (!newFeedButton) return

            const newReleasesIcon = document.getElementById('chorus-new-releases')
            const configDialog = document.getElementById('chorus-config-dialog-trigger')
            if (!newReleasesIcon) {
                const releasesIcon = document.createElement('div')
                newFeedButton.parentElement?.insertBefore(releasesIcon, newFeedButton)
                mount(NewReleasesIcon, { target: releasesIcon })
            }
            if (configDialog) return

            const configDialogContainer = document.createElement('div')
            newFeedButton.parentElement?.insertBefore(configDialogContainer, newFeedButton)
            mount(ChorusConfigDialog, { target: configDialogContainer })
        },
        onRemove: (app) => unmount(app)
    })
    ui.autoMount()
}

const watchPattern = new MatchPattern('*://open.spotify.com/*')

export default defineContentScript({
    matches: ['*://open.spotify.com/*'],

    async main(ctx) {
        await injectChorusUI(ctx)
        ctx.addEventListener(window, 'wxt:locationchange', async ({ newUrl }) => {
            if (watchPattern.includes(newUrl)) await injectChorusUI(ctx)
        })
    }
})
