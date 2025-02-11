import { sendBackgroundMessage } from './utils/messaging.js'
import { getState, setState, removeState } from './utils/state.js'

const loadScript = (filePath) => {
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL(filePath)
    script.type = 'module'
    document.head.appendChild(script)
    script.onload = () => {
        script.remove()
    }
}

loadScript('actions/init.js')
sessionStorage.setItem('soundsDir', chrome.runtime.getURL('/lib/sounds/'))
sessionStorage.setItem('reverbPath', chrome.runtime.getURL('/lib/reverb/reverb.js'))

const sendEventToPage = ({ eventType, detail }) => {
    window.postMessage(
        { type: 'FROM_CONTENT_SCRIPT', requestType: eventType, payload: detail },
        window.location.origin
    )
}

window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin) return
    if (event.data.type !== 'FROM_PAGE_SCRIPT') return

    const { requestType, payload } = event.data
    const messageHandlers = {
        'storage.populate': () => getState(null),
        'storage.get': ({ key }) => getState(key),
        'storage.delete': ({ key }) => removeState(key),
        'storage.set': ({ key, values }) => setState({ key, values })
    }

    const handlerFn = messageHandlers?.[requestType] ?? sendBackgroundMessage
    if (!handlerFn) return

    const response = await handlerFn(payload)
    sendEventToPage({ eventType: `${requestType}.response`, detail: response })
})

chrome.runtime.onMessage.addListener((message) => {
    const messageKey = Object.keys(message)
    const changedKey = messageKey.find((key) =>
        ['now-playing', 'connection_id', 'enabled', 'auth_token', 'device_id'].includes(key)
    )

    if (!changedKey) return

    sendEventToPage({
        eventType: `app.${changedKey}`,
        detail: { [changedKey]: message[changedKey] }
    })
})
