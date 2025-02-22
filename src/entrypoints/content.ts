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

        sessionStorage.setItem('chorus:sounds_dir', chrome.runtime.getURL('sounds/'))
        sessionStorage.setItem('chorus:reverb_path', chrome.runtime.getURL('processor.js'))

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            const messageKey = Object.keys(message)
            const changedKey = messageKey.find((key) =>
                ['enabled', 'now-playing', 'auth_token', 'device_id', 'connection_id'].includes(key)
            )

            if (!changedKey) return

            return true
        })
    }
})
