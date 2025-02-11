export default defineBackground(() => {
    async function registerScripts() {
        const scripts = [
            {
                id: 'media-override',
                js: ['media-override.js'],
                matches: ['<all_urls>'],
                runAt: 'document_start',
                world: 'MAIN'
            },
            {
                id: 'media-listener',
                js: ['media-listener.js'],
                matches: ['<all_urls>'],
                runAt: 'document_start',
                world: 'ISOLATED'
            }
        ]

        try {
            await chrome.scripting.registerContentScripts(scripts)
        } catch (error) {
            if (error instanceof Error && error.message.includes('already exists')) {
                await chrome.scripting.unregisterContentScripts()
                await chrome.scripting.registerContentScripts(scripts)
            }
        }
    }

    registerScripts()
})
