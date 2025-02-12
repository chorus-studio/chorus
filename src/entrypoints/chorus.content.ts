import '../app.css'
import App from '../App.svelte'
import { mount, unmount } from 'svelte'

export default defineContentScript({
    matches: ['*://open.spotify.com/*'],

    main(ctx) {
        const ui = createIntegratedUi(ctx, {
            position: 'inline',
            anchor: '[data-testid="now-playing-widget"]',
            onMount: (container) => {
                mount(App, { target: container })
            },
            onRemove: (app) => {
                unmount(app)
            }
        })
        ui.autoMount()
    }
})
