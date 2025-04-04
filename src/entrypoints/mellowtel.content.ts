import { mellowtel } from '$lib/utils/mellowtel'

export default defineContentScript({
    matches: ['<all_urls>'],
    runAt: 'document_start',
    allFrames: true,
    main: async () => {
        await mellowtel.initContentScript()
    }
})
