import { storage } from '@wxt-dev/storage'
import { mount, unmount } from 'svelte'

import type { SettingsState } from '$lib/stores/settings'
import { injectTheme, removeTheme } from '$lib/utils/theming'

import '../app.css'
import './dynamic-theme.content.css'

import App from '../App.svelte'
import Alert from '$lib/components/Alert.svelte'
import LoopButton from '$lib/components/LoopButton.svelte'
import SeekButton from '$lib/components/SeekButton.svelte'

export default defineContentScript({
    matches: ['*://open.spotify.com/*'],

    async main(ctx) {
        await injectScript('/media-override.js')
        const settings = await storage.getItem<SettingsState>('local:chorus_settings')
        settings?.ui?.theming ? injectTheme() : removeTheme()

        const ui = createIntegratedUi(ctx, {
            position: 'inline',
            anchor: '[data-testid="now-playing-widget"]',
            onMount: (container) => {
                const skipBack = document.querySelector('[data-testid="control-button-skip-back"]')
                const skipForward = document.querySelector(
                    '[data-testid="control-button-skip-forward"]'
                )
                mount(App, { target: container })
                const body = document.querySelector('body')
                if (body) {
                    mount(Alert, { target: body })
                }
                if (skipBack) {
                    const seekBack = document.querySelector('#seek-player-rw-button')
                    if (!seekBack) {
                        const div = document.createElement('div')
                        skipBack.parentElement?.insertBefore(div, skipBack)
                        mount(SeekButton, { target: div, props: { role: 'seek-backward' } })
                    }
                }
                if (skipForward) {
                    const seekForward = document.querySelector('#seek-player-ff-button')
                    const loopButton = document.querySelector('#loop-button')
                    if (!seekForward && !loopButton) {
                        const forwardDiv = document.createElement('div')
                        const loopDiv = document.createElement('div')
                        const parentElement = skipForward.parentElement
                        if (parentElement?.lastElementChild) {
                            parentElement?.insertBefore(forwardDiv, skipForward.nextSibling)
                            parentElement?.insertBefore(
                                loopDiv,
                                parentElement?.lastElementChild?.nextSibling
                            )
                            mount(SeekButton, {
                                target: forwardDiv,
                                props: { role: 'seek-forward' }
                            })
                            mount(LoopButton, { target: loopDiv })
                        }
                    }
                }
            },
            onRemove: (app) => {
                unmount(app)
            }
        })
        ui.autoMount()
    }
})
