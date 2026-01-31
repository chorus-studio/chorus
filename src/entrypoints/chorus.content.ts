import { mount, unmount } from 'svelte'

import { MatchPattern } from 'wxt/sandbox'
import { setTheme } from '$lib/utils/theming'
import { type SettingsState, SETTINGS_STORE_KEY } from '$lib/stores/settings'
import { type ContentScriptContext, injectScript, createIntegratedUi } from 'wxt/client'

import '../app.css'
import App from '../App.svelte'
import Alert from '$lib/components/Alert.svelte'
import LoopButton from '$lib/components/LoopButton.svelte'
import SeekButton from '$lib/components/SeekButton.svelte'
// import NewReleasesIcon from '$lib/components/NewReleasesIcon.svelte'
import ChorusConfigDialog from '$lib/components/ChorusConfigDialog.svelte'
import BlockedTracksDialog from '$lib/components/BlockedTracksDialog.svelte'

async function injectChorusUI(ctx: ContentScriptContext) {
    await injectScript('/router.js')
    await injectScript('/media-override.js')

    const settings = await storage.getItem<SettingsState>(SETTINGS_STORE_KEY)
    const theme = settings?.theme ? settings.theme.name : 'spotify'
    await setTheme(theme)

    const ui = createIntegratedUi(ctx, {
        position: 'inline',
        anchor: '[data-testid="now-playing-widget"]',
        onMount: (container) => {
            const chorusUI = document.getElementById('chorus-ui')
            if (chorusUI) return

            // Batch all DOM queries upfront
            const elements = {
                skipBack: document.querySelector('[data-testid="control-button-skip-back"]'),
                skipForward: document.querySelector('[data-testid="control-button-skip-forward"]'),
                body: document.querySelector('body'),
                formInput: document.querySelector(
                    'input[data-encore-id="formInput"]'
                ) as HTMLInputElement | null,
                newFeedButton: document.querySelector('[data-testid="whats-new-feed-button"]'),
                configDialog: document.getElementById('chorus-config-dialog-trigger'),
                blockedTracksDialog: document.getElementById('blocked-tracks-dialog-trigger'),
                seekBack: document.querySelector('#seek-player-rw-button'),
                seekForward: document.querySelector('#seek-player-ff-button'),
                loopButton: document.querySelector('#loop-button')
            }

            // Mount main app
            mount(App, { target: container })
            if (elements.body) {
                mount(Alert, { target: elements.body })
            }

            // Apply form input styles
            if (elements.formInput) {
                elements.formInput.style.paddingRight = '0 !important'
                elements.formInput.style.paddingLeft = '48px !important'
            }

            // Mount dialogs in newFeedButton area
            if (elements.newFeedButton?.parentElement) {
                const parent = elements.newFeedButton.parentElement

                if (!elements.configDialog) {
                    const configDialog = document.createElement('div')
                    parent.insertBefore(configDialog, elements.newFeedButton)
                    mount(ChorusConfigDialog, { target: configDialog })
                }
                if (!elements.blockedTracksDialog) {
                    const blockedDialog = document.createElement('div')
                    parent.insertBefore(blockedDialog, elements.newFeedButton)
                    mount(BlockedTracksDialog, { target: blockedDialog })
                }
            }

            // Mount seek back button
            if (elements.skipBack?.parentElement && !elements.seekBack) {
                const div = document.createElement('div')
                elements.skipBack.parentElement.insertBefore(div, elements.skipBack)
                mount(SeekButton, { target: div, props: { role: 'seek-backward' } })
            }

            // Mount seek forward and loop buttons
            if (
                elements.skipForward?.parentElement &&
                !elements.seekForward &&
                !elements.loopButton
            ) {
                const parentElement = elements.skipForward.parentElement
                if (parentElement.lastElementChild) {
                    const forwardDiv = document.createElement('div')
                    const loopDiv = document.createElement('div')

                    parentElement.insertBefore(forwardDiv, elements.skipForward.nextSibling)
                    parentElement.insertBefore(loopDiv, parentElement.lastElementChild.nextSibling)

                    mount(SeekButton, {
                        target: forwardDiv,
                        props: { role: 'seek-forward' }
                    })
                    mount(LoopButton, { target: loopDiv })
                }
            }
        },
        onRemove: (app) => {
            if (app) unmount(app)
        }
    })
    ui.autoMount()
}

const watchPattern = new MatchPattern('*://open.spotify.com/*')

export default defineContentScript({
    matches: ['*://open.spotify.com/*', '*://*.spotifycdn.com/audio/*'],

    async main(ctx) {
        await injectChorusUI(ctx)
        ctx.addEventListener(window, 'wxt:locationchange', async ({ newUrl }) => {
            if (watchPattern.includes(newUrl)) await injectChorusUI(ctx)
        })
    }
})
