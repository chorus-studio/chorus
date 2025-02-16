import { storage } from '@wxt-dev/storage'
import { getState, setState } from '$lib/utils/state'
import { chorusKeys, mediaKeys } from '$lib/utils/selectors'
import { activeOpenTab, sendMessage } from '$lib/utils/messaging'

export default defineBackground(() => {
    let ENABLED = true
    let popupPort: chrome.runtime.Port | null = null

    async function registerScripts() {
        const scripts: chrome.scripting.RegisteredContentScript[] = [
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

    async function getUIState({
        selector,
        tabId,
        delay = 0
    }: {
        selector: string
        tabId: number
        delay?: number
    }) {
        const [result] = await chrome.scripting.executeScript({
            args: [selector, delay],
            target: { tabId },
            func: (selector, delay) =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(
                            document
                                .querySelector(selector as string)
                                ?.getAttribute('aria-label')
                                ?.toLowerCase()
                        )
                    }, delay as number)
                })
        })

        return result?.result
    }

    async function getMediaControlsState(tabId: number) {
        const requiredKeys = [
            'repeat',
            'shuffle',
            'play/pause',
            'seek-rewind',
            'seek-fastforward',
            'loop',
            'save/unsave'
        ]
        const selectorKeys = { ...mediaKeys, ...chorusKeys }
        const selectors = requiredKeys
            .map((key) => selectorKeys[key as keyof typeof selectorKeys] ?? undefined)
            .filter(Boolean)
        const promises = selectors.map(
            (selector) =>
                new Promise((resolve) => {
                    if (selector.search(/(loop)|(heart)/g) < 0) {
                        return resolve(getUIState({ selector, tabId }))
                    }
                    return setTimeout(() => resolve(getUIState({ selector, tabId })), 500)
                })
        )

        const results = await Promise.allSettled(promises)
        return results.map((item, idx) => ({
            data: item.status === 'fulfilled' ? item.value : null,
            key: requiredKeys[idx]
        }))
    }

    async function setMediaState({ active, tabId }: { active: boolean; tabId?: number }) {
        popupPort?.postMessage({ type: 'ui-state', data: { active } })

        if (!active || !tabId) return

        const state = await getMediaControlsState(tabId)
        return popupPort?.postMessage({ type: 'state', data: state })
    }

    chrome.runtime.onConnect.addListener(async (port) => {
        if (port.name !== 'popup') return

        popupPort = port
        const { active, tabId } = await activeOpenTab()
        await setMediaState({ active, tabId })

        port.onMessage.addListener(async (message) => {
            if (message?.type !== 'controls') return

            const executeResult = await executeButtonClick({ command: message.key })
            if (!executeResult?.selector || !executeResult?.tabId) return

            const { selector, tabId } = executeResult
            const delay = selector.includes('heart') ? 500 : 0
            const result = await getUIState({ selector, tabId, delay })

            port.postMessage({ type: 'controls', data: { key: message.key, result } })
        })

        port.onDisconnect.addListener(() => (popupPort = null))
    })

    // type PromiseHandlerParams<T> = {
    //     promise: Promise<T>
    //     sendResponse: (response: { state: string, data?: T, error?: string }) => void
    // }

    // function promiseHandler<T>({ promise, sendResponse }: PromiseHandlerParams<T>) {
    //     promise
    //         .then((result) => sendResponse({ state: 'completed', data: result }))
    //         .catch((error) => sendResponse({ state: 'error', error: error.message }))
    // }

    // chrome.runtime.onMessage.addListener(({ key, values }, _, sendResponse) => {
    //     const messageHandler = {
    //         'queue.set': setQueueList,
    //         'queue.get': getQueueList,
    //         'play.shared': playSharedTrack,
    //         'play.seek': seekTrackToPosition,
    //         'tracks.album': getAlbum,
    //         'tracks.update': updateLikedTracks,
    //         'tracks.liked': checkIfTracksInCollection,
    //         'artist.disco': createArtistDiscoPlaylist
    //     }

    //     const handlerFn = messageHandler[key]
    //     handlerFn
    //         ? promiseHandler(handlerFn(values), sendResponse)
    //         : sendResponse({ state: 'error', error: 'key not not configured' })
    //     return true
    // })

    // storage.watch('local:now-playing', async (newValues) => {
    //     console.log('now-playing', newValues)
    //     if (!popupPort) return

    //     const { active, tabId } = await activeOpenTab()
    //     active && popupPort.postMessage({ type: 'now-playing', data: newValues })
    //     await setMediaState({ active, tabId })
    // })

    chrome.webRequest.onBeforeRequest.addListener(
        (details) => {
            const rawBody = details?.requestBody?.raw?.at(0)?.bytes
            if (!rawBody) return

            const text = new TextDecoder('utf-8').decode(new Uint8Array(rawBody))
            const data = JSON.parse(text)
            setState({ key: 'device_id', values: data.device.device_id.toString() })
            setState({ key: 'connection_id', values: data.connection_id.toString() })
        },
        { urls: ['https://guc3-spclient.spotify.com/track-playback/v1/devices'] },
        ['requestBody']
    )

    function getTrackId(url: string) {
        const query = new URL(url)
        const params = new URLSearchParams(query.search)
        const variables = params.get('variables')
        const uris = JSON.parse(decodeURIComponent(variables ?? '')).uris.at(0)
        return uris.split('track:').at(-1)
    }

    chrome.webRequest.onBeforeSendHeaders.addListener(
        async (details) => {
            if (details.url.includes('areEntitiesInLibrary')) {
                const nowPlaying = (await getState('now-playing')) as Record<string, any>
                if (!nowPlaying) return
                if (nowPlaying?.trackId) return

                nowPlaying.trackId = getTrackId(details.url)
                await setState({ key: 'now-playing', values: nowPlaying })
            }

            const authHeader = details?.requestHeaders?.find(
                (header) => header?.name == 'authorization'
            )
            if (!authHeader) return

            await setState({ key: 'auth_token', values: authHeader?.value })
        },
        {
            urls: [
                'https://api.spotify.com/*',
                'https://guc3-spclient.spotify.com/track-playback/v1/devices',
                'https://api-partner.spotify.com/pathfinder/v1/query?operationName=areEntitiesInLibrary*'
            ]
        },
        ['requestHeaders']
    )

    type ExecuteButtonClickParams = {
        command: string
        isShortCutKey?: boolean
    }

    async function executeButtonClick({
        command,
        isShortCutKey = false
    }: ExecuteButtonClickParams) {
        const { active, tabId } = await activeOpenTab()
        if (!active || !tabId) return

        if (command == 'on/off') {
            const enabled = await getState('enabled')
            return await setState({ key: 'enabled', values: !enabled })
        }

        const selector =
            chorusKeys[command as keyof typeof chorusKeys] ||
            mediaKeys[command as keyof typeof mediaKeys]

        const isChorusCommand = Object.keys(chorusKeys).includes(command)

        if (isShortCutKey && !ENABLED && isChorusCommand) return

        await chrome.scripting.executeScript({
            args: [selector],
            target: { tabId },
            func: (selector) => {
                ;(document.querySelector(selector) as HTMLElement)?.click()
            }
        })

        if (!isShortCutKey) return { selector, tabId }
    }

    chrome.commands.onCommand.addListener(
        async (command) => await executeButtonClick({ command, isShortCutKey: true })
    )
})
