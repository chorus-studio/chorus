export default defineContentScript({
    matches: ['*://open.spotify.com/*'],
    main() {
        function loadScript(src: string) {
            const script = document.createElement('script')
            script.type = 'module'
            script.src = chrome.runtime.getURL(src)
            document.head.appendChild(script)
            script.onload = () => script.remove()
        }

        loadScript('/init.js')

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            const messageKey = Object.keys(message)
            const changedKey = messageKey.find((key) =>
                ['enabled', 'now-playing', 'auth_token', 'device_id', 'connection_id'].includes(key)
            )

            if (!changedKey) return

            // if (!changedKey) return true

            // if (sender.id !== chrome.runtime.id) return true
            // if (!action?.startsWith('CHORUS')) return true

            // const responseHandler = (event: CustomEvent) => {
            //     document.removeEventListener('chorus_response', responseHandler as EventListener)
            //     sendResponse(event.detail)
            // }

            // document.addEventListener('chorus_response', responseHandler as EventListener)
            // document.dispatchEvent(new CustomEvent('chorus', { detail: { action, data } }))

            return true
        })
    }
})
