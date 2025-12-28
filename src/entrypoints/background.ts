import { storage } from '@wxt-dev/storage'
import { THEME_NAMES } from '$lib/utils/theming'
import { activeOpenTab } from '$lib/utils/messaging'
import type { ConfigState } from '$lib/stores/config'
import { defaultPlayback } from '$lib/stores/playback'
import { defaultAudioEffect } from '$lib/stores/effects'
import type { NowPlaying } from '$lib/stores/now-playing'
import type { SettingsState } from '$lib/stores/settings'
import { registerTrackService } from '$lib/api/services/track'
import { registerPlayerService } from '$lib/api/services/player'
import type { CrossfadeSettings } from '$lib/audio-effects/crossfade/types'
import { registerNewReleasesService } from '$lib/api/services/new-releases'
import { registerCheckPermissionsService } from '$lib/utils/check-permissions'
import { executeButtonClick, registerCommandService } from '$lib/utils/command'
import { registerNotificationService, showNotification } from '$lib/utils/notifications'

export default defineBackground(() => {
    const STORE_KEYS = {
        CONFIG: 'local:chorus_config' as const,
        SETTINGS: 'local:chorus_settings' as const,
        RELEASES: 'local:chorus_releases' as const,
        DEVICE_ID: 'local:chorus_device_id' as const,
        CROSSFADE: 'local:chorus_crossfade' as const,
        AUTH_TOKEN: 'local:chorus_auth_token' as const,
        NOW_PLAYING: 'local:chorus_now_playing' as const,
        CONNECTION_ID: 'local:chorus_connection_id' as const
    }

    const CUSTOM_EVENTS = {
        volume: 'FROM_VOLUME_LISTENER',
        init_media: 'FROM_MEDIA_PLAY_INIT',
        current_time: 'FROM_CURRENT_TIME_LISTENER'
    }

    async function executeScript(message: { type: string; data: any }) {
        const { tabId } = await activeOpenTab()
        if (!tabId) return

        await browser.scripting.executeScript({
            args: [
                {
                    value: message.data,
                    type: CUSTOM_EVENTS[message.type as keyof typeof CUSTOM_EVENTS] ?? message.type
                }
            ],
            target: { tabId },
            func: (data) => {
                if (data.type == 'theme_change') {
                    document.dispatchEvent(
                        new CustomEvent('FROM_THEME_CHANGE', { detail: { theme: data.value } })
                    )
                } else if (data.type == 'init_media') {
                    document.dispatchEvent(new CustomEvent('FROM_MEDIA_PLAY_INIT'))
                } else if (data.type == 'audio_preset') {
                    const { playback, effect } = data?.value
                    window.postMessage({ type: 'FROM_EFFECTS_LISTENER', data: effect }, '*')
                    window.postMessage({ type: 'FROM_PLAYBACK_LISTENER', data: playback }, '*')
                } else {
                    window.postMessage({ type: data.type, data: data?.value }, '*')
                }
            }
        })
    }

    browser.runtime.onConnect.addListener(async (port) => {
        if (port.name !== 'popup') return

        port.onMessage.addListener(async (message) => {
            if (message?.type == 'controls') {
                return await executeButtonClick({ command: message.key })
            }

            if (!Object.keys(CUSTOM_EVENTS).includes(message.type)) return

            await executeScript(message)
        })
    })

    registerTrackService()
    registerPlayerService()
    registerCommandService()
    registerNotificationService()
    registerNewReleasesService()
    registerCheckPermissionsService()

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
                        key: STORE_KEYS.DEVICE_ID,
                        value: data.device.device_id
                    },
                    {
                        key: STORE_KEYS.CONNECTION_ID,
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

                storage.getItem(STORE_KEYS.NOW_PLAYING).then((nowPlaying) => {
                    if (!nowPlaying) return

                    const currentState = nowPlaying as NowPlaying
                    currentState.track_id = trackDetails
                    storage.setItem(STORE_KEYS.NOW_PLAYING, currentState)
                })
            }

            const authHeader = details?.requestHeaders?.find(
                (header) => header?.name == 'authorization'
            )
            if (!authHeader) return

            storage.setItem(STORE_KEYS.AUTH_TOKEN, authHeader?.value ?? '')
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

    // ============================================================================
    // Crossfade: Audio chunk interception for track transitions
    // ============================================================================

    let audioRange = { start: 0, end: 0 }
    let audioTrackId: string | null = null

    function arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer)
        const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
        return btoa(binary)
    }

    browser.webRequest.onSendHeaders.addListener(
        async (details) => {
            // Check if crossfade is enabled
            const crossfadeSettings = await storage.getItem<CrossfadeSettings>(STORE_KEYS.CROSSFADE)
            if (!crossfadeSettings || !crossfadeSettings.enabled) return

            if (!details?.url.includes('spotifycdn.com/audio')) return

            // Extract Range header
            const rangeHeader = details?.requestHeaders?.find(
                (h) => h.name.toLowerCase() === 'range'
            )?.value

            if (!rangeHeader) return

            const match = rangeHeader.match(/bytes=(\d+)-(\d+)/)
            if (!match) return

            const start = parseInt(match[1], 10)
            const end = parseInt(match[2], 10)

            // Extract track ID from URL
            const trackId = details.url.split('audio/')[1]?.split('?')[0]
            if (!trackId) return

            // Track change detected - new track starting
            const isNewTrack = audioTrackId && audioTrackId !== trackId

            // Reset tracking for new track or first chunk
            if (start === 0 || isNewTrack) {
                audioRange = { start, end }
                const previousTrackId = audioTrackId
                audioTrackId = trackId

                // If this is a new track (not the first), we want to send this chunk
                // so the crossfade can use it
                if (isNewTrack) {
                    console.log('[Crossfade/BG] Track change detected:', {
                        from: previousTrackId,
                        to: trackId
                    })
                    // Continue to send this chunk
                } else {
                    // First chunk of first track, just track it
                    return
                }
            } else {
                // Only process sequential chunks for same track
                if (trackId !== audioTrackId || start !== audioRange.end + 1) return

                audioRange = { start, end }
            }

            try {
                // Fetch audio chunk
                const response = await fetch(details.url, {
                    headers: { Range: `bytes=${start}-${end}` }
                })

                if (!response.ok) {
                    console.warn('[Crossfade/BG] Fetch failed:', response.status)
                    return
                }

                const arrayBuffer = await response.arrayBuffer()
                const base64Data = arrayBufferToBase64(arrayBuffer)

                console.log('[Crossfade/BG] Sending chunk to page:', {
                    trackId,
                    range: { start, end },
                    size: arrayBuffer.byteLength
                })

                // Send to page context
                const { tabId } = await activeOpenTab()
                if (!tabId) {
                    console.warn('[Crossfade/BG] No active tab')
                    return
                }

                await browser.scripting.executeScript({
                    args: [
                        {
                            type: 'FROM_CROSSFADE_BUFFER',
                            data: {
                                data: base64Data,
                                range: { start, end },
                                trackId,
                                url: details.url
                            }
                        }
                    ],
                    target: { tabId },
                    func: (message) => {
                        window.postMessage(message, '*')
                    }
                })
            } catch (error) {
                console.error('[Crossfade/BG] Error:', error)
            }
        },
        {
            urls: ['*://*.spotifycdn.com/audio/*']
        },
        ['requestHeaders']
    )

    browser.commands.onCommand.addListener(async (command) => {
        if (
            !command.startsWith('cycle-theme-') &&
            !command.startsWith('audio-preset-') &&
            !['show-track', 'toggle-new-releases', 'toggle-config'].includes(command)
        ) {
            return await executeButtonClick({ command, isShortCutKey: true })
        }

        if (command === 'show-track') {
            const settings = await storage.getItem<SettingsState>(STORE_KEYS.SETTINGS)
            if (!settings?.notifications?.enabled) return

            const nowPlaying = await storage.getItem<NowPlaying>(STORE_KEYS.NOW_PLAYING)
            if (nowPlaying) await showNotification(nowPlaying)
        }

        if (command.startsWith('cycle-theme-')) {
            const settings = await storage.getItem<SettingsState>(STORE_KEYS.SETTINGS)
            const theme = settings?.theme?.name
            if (!theme) return

            const index = THEME_NAMES.indexOf(theme)
            const goToNext = command.endsWith('-next')
            const nextIndex = goToNext
                ? (index + 1) % THEME_NAMES.length
                : index === 0
                  ? THEME_NAMES.length - 1
                  : index - 1
            const nextTheme = THEME_NAMES[nextIndex]

            await executeScript({ type: 'theme_change', data: nextTheme })
            await storage.setItem(STORE_KEYS.SETTINGS, {
                ...settings,
                theme: { ...settings.theme, name: nextTheme }
            })
        }

        if (command.startsWith('audio-preset-')) {
            const index = Number(command.split('-').at(-1)) - 1
            const config = await storage.getItem<ConfigState>(STORE_KEYS.CONFIG)
            const preset = config?.audio_presets[index]
            if (!preset) return

            const data = preset?.active
                ? { effect: defaultAudioEffect, playback: defaultPlayback }
                : preset

            await executeScript({ type: 'audio_preset', data })
            await storage.setItem(STORE_KEYS.CONFIG, {
                ...config,
                audio_presets: config.audio_presets.map((p) => {
                    const target = p.id == preset.id
                    return { ...p, active: target ? !preset.active : false }
                })
            })
        }

        if (['toggle-new-releases', 'toggle-config'].includes(command)) {
            await executeButtonClick({ command, isShortCutKey: true })
        }
    })
})
