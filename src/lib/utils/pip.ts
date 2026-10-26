import { get } from 'svelte/store'
import { mount, unmount } from 'svelte'
import { pipStore } from '$lib/stores/pip'
import { settingsStore } from '$lib/stores/settings'
import { applyGlass } from '$lib/utils/theming'
import PipView from '$lib/components/views/Pip.svelte'

// Module-scoped handle to the currently open PiP window so it can be closed from
// outside the component tree (e.g. when the extension is toggled off and the App —
// and the PipButton that owned the window — is unmounted).
let activePipWindow: Window | undefined

export function closePictureInPicture() {
    try {
        activePipWindow?.close()
    } catch (error) {
        console.warn('Error closing Picture-in-Picture window:', error)
    }
    activePipWindow = undefined
}

// The look lives on the main document's root: theme tokens inline (utils/theming.ts)
// plus the data-mode / data-glass / data-refraction attributes. Carry them over so
// the PiP rack is tinted, lit and (optionally) glassed like the page; the glass
// filter has to exist in the PiP document itself for backdrop-filter to find it.
const LOOK_ATTRIBUTES = ['data-mode', 'data-glass', 'data-refraction']

function syncLook(pipWindow: Window) {
    const from = document.documentElement
    const to = pipWindow.document.documentElement
    to.style.cssText = from.style.cssText
    for (const name of LOOK_ATTRIBUTES) {
        const value = from.getAttribute(name)
        if (value === null) to.removeAttribute(name)
        else to.setAttribute(name, value)
    }
    applyGlass(get(settingsStore), pipWindow.document)
}

export async function applyStyles(pipWindow: Window) {
    // Copy all stylesheets from the main window
    ;[...document.styleSheets].forEach((styleSheet) => {
        try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('')
            if (!cssRules) return

            const style = pipWindow.document.createElement('style')
            style.textContent = cssRules
            pipWindow.document.head.appendChild(style)
        } catch (e) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.type = styleSheet.type || 'text/css'
            link.media = styleSheet.media?.mediaText || 'all'
            if (styleSheet.href) {
                link.href = styleSheet.href
                pipWindow.document.head.appendChild(link)
            }
        }
    })

    syncLook(pipWindow)

    // Add the chorus stylesheet
    const style = chrome.runtime.getURL('content-scripts/chorus.css')
    const link = pipWindow.document.createElement('link')
    link.href = style
    link.rel = 'stylesheet'
    pipWindow.document.head.appendChild(link)
}

export async function togglePictureInPicture() {
    if (!('documentPictureInPicture' in window)) {
        console.warn('Document Picture-in-Picture API not supported')
        return
    }

    try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 440,
            height: 320
        })

        // Create a container for the PipView
        const pipView = document.createElement('div')
        pipView.id = 'chorus-pip-view'
        pipView.style.position = 'absolute'
        pipView.style.top = '50%'
        pipView.style.left = '50%'
        pipView.style.transform = 'translate(-50%, -50%)'
        pipView.style.width = '100%'
        pipView.style.height = '100%'
        pipView.style.background = 'hsl(var(--ink))'
        pipView.style.display = 'flex'
        pipView.style.flexDirection = 'column'
        pipView.style.justifyContent = 'center'
        pipView.style.alignItems = 'center'

        // Apply styles
        await applyStyles(pipWindow)
        pipWindow.document.body.appendChild(pipView)

        // Keep the PiP in step when the theme, appearance or glass is changed
        // while the window is open.
        const themeSync = new MutationObserver(() => syncLook(pipWindow))
        themeSync.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', ...LOOK_ATTRIBUTES]
        })

        // Mount the PipView component
        const app = mount(PipView, { target: pipView })
        activePipWindow = pipWindow

        pipWindow.document.addEventListener('click', async (event) => {
            const target = event.composedPath().at(0) as HTMLElement
            if (!target) return

            const { key } = get(pipStore)
            const isTrigger = key && target.id === key
            if (!isTrigger) await pipStore.updatePip({ key: null })
        })

        pipWindow.addEventListener('pagehide', async () => {
            themeSync.disconnect()
            activePipWindow = undefined
            await unmount(app)
            await pipStore.reset()
        })

        pipWindow.addEventListener('exitpictureinpicture', async () => {
            themeSync.disconnect()
            activePipWindow = undefined
            await unmount(app)
            await pipStore.reset()
        })

        return pipWindow
    } catch (error) {
        console.error('Error opening Picture-in-Picture window:', error)
    }
}
