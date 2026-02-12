import { storage } from '@wxt-dev/storage'
import { THEME_NAMES } from '$lib/utils/theming'
import { activeOpenTab } from '$lib/utils/messaging'
import type { ConfigState } from '$lib/stores/config'
import { defaultPlayback } from '$lib/stores/playback'
import { defaultAudioEffect } from '$lib/stores/effects'
import type { NowPlaying } from '$lib/stores/now-playing'
import type { SettingsState } from '$lib/stores/settings'
import { registerTrackService } from '$lib/api/services/track'
import { registerPlayerService, getPlayerService } from '$lib/api/services/player'
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
            world: 'MAIN',
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
                } else if (data.type === 'FROM_CROSSFADE_BUFFER') {
                    document.dispatchEvent(
                        new CustomEvent('FROM_CROSSFADE_BUFFER', { detail: data?.value })
                    )
                } else if (data.type === 'FROM_CROSSFADE_TRACK_CHANGE') {
                    document.dispatchEvent(
                        new CustomEvent('FROM_CROSSFADE_TRACK_CHANGE', { detail: data?.value })
                    )
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
    // Spotify Dealer WebSocket - Real-time player state updates
    // ============================================================================

    let dealerSocket: WebSocket | null = null
    let dealerReconnectTimer: ReturnType<typeof setTimeout> | null = null

    async function connectToDealer() {
        const authToken = await storage.getItem<string>(STORE_KEYS.AUTH_TOKEN)
        if (!authToken) {
            console.log('[Dealer] No auth token, skipping connection')
            return
        }

        // Extract just the token value (remove "Bearer " prefix if present)
        const token = authToken.replace(/^Bearer\s+/i, '')

        try {
            const wsUrl = `wss://guc3-dealer.spotify.com/?access_token=${token}`
            dealerSocket = new WebSocket(wsUrl)

            dealerSocket.onopen = () => {
                console.log('[Dealer] Connected')
                // Subscribe to player state updates
                if (dealerSocket?.readyState === WebSocket.OPEN) {
                    dealerSocket.send(
                        JSON.stringify({
                            type: 'subscribe',
                            payloads: [{ uri: 'spotify:user:*:collection' }]
                        })
                    )
                }
            }

            dealerSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    handleDealerMessage(data)
                } catch {
                    // Non-JSON message, ignore
                }
            }

            dealerSocket.onclose = () => {
                console.log('[Dealer] Disconnected, reconnecting in 5s...')
                dealerSocket = null
                // Reconnect after delay
                if (dealerReconnectTimer) clearTimeout(dealerReconnectTimer)
                dealerReconnectTimer = setTimeout(connectToDealer, 5000)
            }

            dealerSocket.onerror = (error) => {
                console.warn('[Dealer] WebSocket error:', error)
            }
        } catch (error) {
            console.error('[Dealer] Connection error:', error)
        }
    }

    function handleDealerMessage(data: any) {
        // Dealer messages have various formats, look for player state updates
        // Common message types: player_state, device_state_changed, etc.

        // Check for track in queue/next track info
        const payload = data?.payloads?.[0]
        if (!payload) return

        // Look for cluster updates which contain player state
        const cluster = payload?.cluster
        if (cluster?.player_state) {
            const playerState = cluster.player_state
            const nextTracks = playerState?.next_tracks
            if (nextTracks && nextTracks.length > 0) {
                const nextTrack = nextTracks[0]
                if (nextTrack?.uri) {
                    // Store via PlayerService so content script can access it
                    getPlayerService().setNextTrackUri(nextTrack.uri)
                    console.log('[Dealer] Next track:', nextTrack.uri)
                }
            }
        }

        // Also check for state_ref updates
        if (payload?.state_ref?.state) {
            try {
                const state = JSON.parse(payload.state_ref.state)
                if (state?.next_tracks?.[0]?.uri) {
                    const uri = state.next_tracks[0].uri
                    getPlayerService().setNextTrackUri(uri)
                    console.log('[Dealer] Next track (state_ref):', uri)
                }
            } catch {
                // Not JSON state
            }
        }
    }

    // Connect to dealer when auth token is available
    storage.watch<string>(STORE_KEYS.AUTH_TOKEN, (newToken) => {
        if (newToken && !dealerSocket) {
            connectToDealer()
        }
    })

    // Initial connection attempt
    connectToDealer()

    // ============================================================================
    // Crossfade: Audio chunk interception for track transitions
    // Uses MSE approach: cache init segments, decode next track with MediaSource
    // ============================================================================

    let audioTrackId: string | null = null
    // Cache init segments per track (keyed by trackId)
    const initSegmentCache = new Map<string, string>()
    // Track URLs for fetching init segments
    const trackUrlCache = new Map<string, string>()

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

            // Extract track ID from URL
            const trackId = details.url.split('audio/')[1]?.split('?')[0]
            if (!trackId) return

            // Extract Range header
            const rangeHeader = details?.requestHeaders?.find(
                (h) => h.name.toLowerCase() === 'range'
            )?.value

            if (!rangeHeader) return

            const match = rangeHeader.match(/bytes=(\d+)-(\d+)/)
            if (!match) return

            const start = parseInt(match[1], 10)
            const end = parseInt(match[2], 10)

            // Cache the track URL (base URL without range)
            if (!trackUrlCache.has(trackId)) {
                trackUrlCache.set(trackId, details.url)
            }

            // Check if this track is currently being processed or already sent
            const sentKey = trackId + '_sent'
            const processingKey = trackId + '_processing'
            const isProcessingOrSent =
                trackUrlCache.get(sentKey) || trackUrlCache.get(processingKey)

            // NOTE: We no longer send FROM_CROSSFADE_TRACK_CHANGE here because Spotify
            // pre-fetches media segments for the next track BEFORE it starts playing.
            // This caused the track change event to fire too early (while current track
            // was still playing), which cleared nextTrackData before crossfade could start.
            // Instead, crossfade is triggered by polling time remaining in media-override.ts.

            // Detect track change - we want to send data during PRE-FETCH (init segment)
            // not during playback (media segment), so crossfade can prepare in advance
            const isNewTrack = audioTrackId && audioTrackId !== trackId

            // For same track or media segment, update audioTrackId and return
            if (!isNewTrack || start > 0) {
                if (!audioTrackId || audioTrackId !== trackId) {
                    audioTrackId = trackId
                }
                return
            }

            // This is an INIT segment for a new track (pre-fetch)
            // Skip if already processing or sent (prevents our own fetch from triggering)
            if (isProcessingOrSent) {
                return
            }

            // Mark as processing BEFORE fetch to prevent duplicates
            trackUrlCache.set(processingKey, 'true')

            console.log('[Crossfade BG] New track detected:', {
                from: audioTrackId?.slice(0, 8),
                to: trackId.slice(0, 8),
                duration: crossfadeSettings.duration,
                type: crossfadeSettings.type
            })

            // Fetch enough for crossfade duration
            // fMP4 at 320kbps needs ~40KB/sec, but use 80KB/sec for overhead and higher bitrates
            const crossfadeDuration = crossfadeSettings.duration || 10
            const bytesNeeded = crossfadeDuration * 80000

            // Fetch init segment if not cached
            // Need to get enough to include the full moov box (can be 10-20KB)
            let initSegment = initSegmentCache.get(trackId)
            let initSegmentSize = 0
            if (!initSegment) {
                console.log('[Crossfade BG] Fetching init segment...')
                try {
                    // Fetch first 30KB to ensure we get the full moov box
                    const initResponse = await fetch(details.url, {
                        headers: { Range: 'bytes=0-30000' }
                    })
                    if (initResponse.ok) {
                        const initBuffer = await initResponse.arrayBuffer()
                        initSegmentSize = initBuffer.byteLength

                        // Find the end of the moov box to get just the init segment
                        const view = new DataView(initBuffer)
                        let offset = 0
                        let moovEnd = initBuffer.byteLength

                        // Parse MP4 boxes to find moov end
                        while (offset < initBuffer.byteLength - 8) {
                            const size = view.getUint32(offset)
                            if (size === 0 || size > initBuffer.byteLength - offset) break

                            const type = String.fromCharCode(
                                view.getUint8(offset + 4),
                                view.getUint8(offset + 5),
                                view.getUint8(offset + 6),
                                view.getUint8(offset + 7)
                            )

                            if (type === 'moov') {
                                moovEnd = offset + size
                                console.log(
                                    '[Crossfade BG] Found moov box, size:',
                                    size,
                                    'ends at:',
                                    moovEnd
                                )
                                break
                            }
                            offset += size
                        }

                        // Extract just the init segment (up to end of moov)
                        const initData = initBuffer.slice(0, moovEnd)
                        initSegment = arrayBufferToBase64(initData)
                        initSegmentSize = moovEnd
                        initSegmentCache.set(trackId, initSegment)
                        console.log('[Crossfade BG] Init segment size:', initSegmentSize)
                    }
                } catch (error) {
                    console.error('[Crossfade BG] Init fetch error:', error)
                }
            }

            if (!initSegment) {
                console.log('[Crossfade BG] No init segment, aborting')
                return
            }

            // Fetch media segment starting right after the init segment
            const mediaStart = initSegmentSize > 0 ? initSegmentSize : start === 0 ? end + 1 : start
            const mediaEnd = mediaStart + bytesNeeded

            console.log('[Crossfade BG] Fetching media segment:', mediaStart, '-', mediaEnd)

            try {
                const response = await fetch(details.url, {
                    headers: { Range: `bytes=${mediaStart}-${mediaEnd}` }
                })

                if (!response.ok) {
                    console.log('[Crossfade BG] Media fetch failed:', response.status)
                    return
                }

                const arrayBuffer = await response.arrayBuffer()
                const mediaSegment = arrayBufferToBase64(arrayBuffer)

                console.log('[Crossfade BG] Media segment fetched:', {
                    requestedBytes: bytesNeeded,
                    actualBytes: arrayBuffer.byteLength,
                    initSegmentBytes: initSegmentSize
                })

                // Mark as sent, clear processing flag
                trackUrlCache.set(trackId + '_sent', 'true')
                trackUrlCache.delete(trackId + '_processing')

                // Send crossfade data to page
                await executeScript({
                    type: 'FROM_CROSSFADE_BUFFER',
                    data: {
                        initSegment,
                        mediaSegment,
                        trackId,
                        url: details.url,
                        settings: {
                            duration: crossfadeSettings.duration,
                            type: crossfadeSettings.type
                        }
                    }
                })

                // Crossfade is triggered by polling time remaining in media-override.ts
            } catch {
                // Clear processing flag on error
                trackUrlCache.delete(trackId + '_processing')
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
