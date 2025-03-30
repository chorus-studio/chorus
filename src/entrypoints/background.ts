import { storage } from '@wxt-dev/storage'
import { activeOpenTab } from '$lib/utils/messaging'
import type { NowPlaying } from '$lib/stores/now-playing'
import { chorusKeys, mediaKeys } from '$lib/utils/selectors'
import { registerTrackService } from '$lib/api/services/track'
import { registerQueueService } from '$lib/api/services/queue'
import { registerPlayerService } from '$lib/api/services/player'

export default defineBackground(() => {
    let popupPort: browser.runtime.Port | null = null

    browser.runtime.onConnect.addListener(async (port) => {
        if (port.name !== 'popup') return

        popupPort = port

        const CUSTOM_EVENTS = {
            volume: 'FROM_VOLUME_LISTENER',
            current_time: 'FROM_CURRENT_TIME_LISTENER'
        }

        port.onMessage.addListener(async (message) => {
            if (message?.type == 'controls') {
                return await executeButtonClick({ command: message.key })
            }

            if (!Object.keys(CUSTOM_EVENTS).includes(message.type)) return

            const { tabId } = await activeOpenTab()
            if (!tabId) return

            await browser.scripting.executeScript({
                args: [
                    {
                        value: message.data,
                        type: CUSTOM_EVENTS[message.type as keyof typeof CUSTOM_EVENTS]
                    }
                ],
                target: { tabId },
                func: (data) => {
                    window.postMessage({ type: data.type, data: data.value }, '*')
                }
            })
        })

        port.onDisconnect.addListener(() => (popupPort = null))
    })

    registerTrackService()
    registerPlayerService()
    registerQueueService()

    browser.webRequest.onBeforeRequest.addListener(
        (details) => {
            try {
                const rawBody = details?.requestBody?.raw?.at(0)?.bytes
                if (!rawBody) return

                const text = new TextDecoder('utf-8').decode(new Uint8Array(rawBody))
                const data = JSON.parse(text)

                if (!data?.device?.device_id || !data?.connection_id) return

                storage.setItems([
                    {
                        key: 'local:chorus_device_id',
                        value: data.device.device_id
                    },
                    {
                        key: 'local:chorus_connection_id',
                        value: data.connection_id
                    }
                ])
            } catch (error) {
                console.error('Error in onBeforeRequest listener:', error)
            }
        },
        { urls: ['https://guc3-spclient.spotify.com/track-playback/v1/devices'] },
        ['requestBody']
    )

    function getTrackId(url: string) {
        const query = new URL(url)
        const params = new URLSearchParams(query.search)
        const variables = params.get('variables')
        const uris = JSON.parse(decodeURIComponent(variables ?? '')).uris.at(0)
        if (!uris || !uris.includes('track:')) return
        return uris.split('track:').at(-1)
    }

    browser.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
            if (details.url.includes('areEntitiesInLibrary')) {
                const trackDetails = getTrackId(details.url)
                if (!trackDetails) return

                storage.getItem('local:chorus_now_playing').then((nowPlaying) => {
                    if (!nowPlaying) return

                    const currentState = nowPlaying as NowPlaying
                    currentState.track_id = trackDetails
                    storage.setItem('local:chorus_now_playing', currentState)
                })
            }

            const authHeader = details?.requestHeaders?.find(
                (header) => header?.name == 'authorization'
            )
            if (!authHeader) return

            storage.setItem('local:chorus_auth_token', authHeader?.value ?? '')
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

        if (command == 'on/off') return

        const selector =
            chorusKeys[command as keyof typeof chorusKeys] ||
            mediaKeys[command as keyof typeof mediaKeys]

        const isChorusCommand = Object.keys(chorusKeys).includes(command)

        if (isShortCutKey && isChorusCommand) return

        await browser.scripting.executeScript({
            args: [selector],
            target: { tabId },
            func: (selector) => {
                if (!selector.includes('control-button-npv')) {
                    return (document.querySelector(selector) as HTMLElement)?.click()
                }
                const target = document.querySelector(selector) as HTMLElement
                const djButton = target.previousElementSibling as HTMLElement
                djButton?.click()
            }
        })

        if (!isShortCutKey) return { selector, tabId }
    }

    browser.commands.onCommand.addListener(
        async (command) => await executeButtonClick({ command, isShortCutKey: true })
    )
})
