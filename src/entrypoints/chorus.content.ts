import { mount, unmount } from 'svelte'

import { MatchPattern } from 'wxt/sandbox'
import { setTheme } from '$lib/utils/theming'
import { getPlayerService } from '$lib/api/services/player'
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

// Listen for messages from MAIN world (media-override.ts)
function setupMessageListener() {
    window.addEventListener('message', async (event) => {
        if (event.source !== window) return

        const { type } = event.data || {}

        if (type === 'CHORUS_SEEK_REQUEST') {
            const { positionMs } = event.data
            // API seek - syncs Spotify's internal state
            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 3000)
                )
                await Promise.race([getPlayerService().seek(positionMs), timeoutPromise])
            } catch {
                // PlayerService failed or timed out
            }
        }

        if (type === 'CHORUS_SKIP_AND_SEEK_REQUEST') {
            const { positionMs } = event.data
            // Start next track at the correct position
            try {
                const playerService = getPlayerService()
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 3000)
                )

                // Try to get next track URI from dealer WebSocket
                const nextTrackUri = await playerService.getNextTrackUri()

                if (nextTrackUri) {
                    // Use playRelease with the exact track and position
                    console.log('[Crossfade] Playing', nextTrackUri, 'at', positionMs, 'ms')
                    await Promise.race([
                        playerService.playRelease(nextTrackUri, positionMs),
                        timeoutPromise
                    ])
                } else {
                    // Fallback: skip to next track and seek
                    console.log('[Crossfade] No URI, using skipNext + seek')
                    await Promise.race([playerService.skipNext(), timeoutPromise])
                    await new Promise((r) => setTimeout(r, 100))
                    await Promise.race([playerService.seek(positionMs), timeoutPromise])
                }
            } catch {
                // PlayerService failed or timed out
            }
        }
    })
}

export default defineContentScript({
    matches: ['*://open.spotify.com/*'],

    async main(ctx) {
        setupMessageListener()
        await injectChorusUI(ctx)
        ctx.addEventListener(window, 'wxt:locationchange', async ({ newUrl }) => {
            if (watchPattern.includes(newUrl)) await injectChorusUI(ctx)
        })
    }
})
