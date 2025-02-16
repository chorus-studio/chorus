import '../app.css'
import App from '../App.svelte'
import SeekButton from '$lib/components/SeekButton.svelte'
import { mount, unmount } from 'svelte'

export default defineContentScript({
    matches: ['*://open.spotify.com/*'],

    main(ctx) {
        const ui = createIntegratedUi(ctx, {
            position: 'inline',
            anchor: '[data-testid="now-playing-widget"]',
            onMount: (container) => {
                const skipBack = document.querySelector('[data-testid="control-button-skip-back"]')
                const skipForward = document.querySelector(
                    '[data-testid="control-button-skip-forward"]'
                )
                mount(App, { target: container })
                if (skipBack) {
                    const div = document.createElement('div')
                    const parentElement = skipBack.parentElement
                    parentElement?.insertBefore(div, skipBack.nextSibling)
                    mount(SeekButton, { target: div, props: { role: 'seek-backward' } })
                }
                if (skipForward) {
                    const div = document.createElement('div')
                    const parentElement = skipForward.parentElement
                    parentElement?.insertBefore(div, skipForward.nextSibling)
                    mount(SeekButton, { target: div, props: { role: 'seek-forward' } })
                }
            },
            onRemove: (app) => {
                unmount(app)
            }
        })
        ui.autoMount()
    }
})
