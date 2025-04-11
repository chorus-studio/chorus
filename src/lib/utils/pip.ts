import { mount, unmount } from 'svelte'
import { pipStore } from '$lib/stores/pip'
import PipView from '$lib/components/views/Pip.svelte'

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
            width: 350,
            height: 270
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
        pipView.style.background = '#000000'
        pipView.style.display = 'flex'
        pipView.style.flexDirection = 'column'
        pipView.style.justifyContent = 'center'
        pipView.style.alignItems = 'center'

        // Apply styles
        await applyStyles(pipWindow)
        pipWindow.document.body.appendChild(pipView)

        // Mount the PipView component
        const app = mount(PipView, { target: pipView })

        pipWindow.document.addEventListener('click', async (event) => {
            const target = event.composedPath().at(0) as HTMLElement
            if (!target) return

            const isTrigger = target.classList.contains('trigger')
            if (!isTrigger) await pipStore.setOpen(false)
        })

        pipWindow.addEventListener('pagehide', async () => {
            await unmount(app)
            await pipStore.reset()
        })

        pipWindow.addEventListener('exitpictureinpicture', async () => {
            await unmount(app)
            await pipStore.reset()
        })

        return pipWindow
    } catch (error) {
        console.error('Error opening Picture-in-Picture window:', error)
    }
}
