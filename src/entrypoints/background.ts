import { storage } from '@wxt-dev/storage'
import { activeOpenTab, getActiveTab } from '$lib/utils/messaging'
import type { ConfigState } from '$lib/stores/config'
import { defaultPlayback, effectivePlayback, type PlaybackSettings } from '$lib/stores/playback'
import { defaultAudioEffect, type AudioEffect } from '$lib/stores/effects'
import {
    normalizeEffectSettings,
    type EffectSettings
} from '$lib/audio-effects/lofi/audio/effect-settings'
import {
    NORMAL_VALUES,
    QUICK_PRESETS,
    QUICK_PRESET_EVENT,
    matchPreset,
    sameValues,
    type PresetValues,
    type QuickPresetMessage
} from '$lib/audio-effects/quick-presets'
import type { NowPlaying } from '$lib/stores/now-playing'
import type { SettingsState } from '$lib/stores/settings'
import { THEME_NAMES } from '$lib/utils/theming'
import { registerTrackService } from '$lib/api/services/track'
import { registerPlayerService } from '$lib/api/services/player'
import { registerNewReleasesService } from '$lib/api/services/new-releases'
import { registerLyricsService } from '$lib/api/services/lyrics'
import { getEnabled, toggleEnabled, watchEnabled } from '$lib/stores/enabled'
import { applyActionIndicator } from '$lib/utils/action-indicator'
import { executeButtonClick, registerCommandService } from '$lib/utils/command'
import { registerNotificationService, showNotification } from '$lib/utils/notifications'

export default defineBackground(() => {
    // Open onboarding page on first install and set uninstall feedback URL
    browser.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            browser.tabs.create({ url: 'https://chorusstudio.org/install' })
        }
    })
    browser.runtime.setUninstallURL('https://chorusstudio.org/uninstall')

    // Mirror the persisted on/off flag in memory so request/command listeners can
    // gate synchronously, and keep the toolbar icon in sync. The top-level read
    // runs on every service-worker (re)start (including fresh browser launch and
    // MV3 respawn), so the OFF icon/title is restored each time. `readyPromise`
    // lets request listeners defer their storage writes until the real flag is
    // known, closing the cold-start window where isEnabled is still the optimistic
    // default. watchEnabled keeps it live afterward.
    let isEnabled = true
    const readyPromise = getEnabled().then((enabled) => {
        isEnabled = enabled
        applyActionIndicator(enabled)
    })
    watchEnabled((enabled) => {
        isEnabled = enabled
        applyActionIndicator(enabled)
    })

    const STORE_KEYS = {
        CONFIG: 'local:chorus_config' as const,
        SETTINGS: 'local:chorus_settings' as const,
        RELEASES: 'local:chorus_releases' as const,
        DEVICE_ID: 'local:chorus_device_id' as const,
        AUTH_TOKEN: 'local:chorus_auth_token' as const,
        NOW_PLAYING: 'local:chorus_now_playing' as const,
        CONNECTION_ID: 'local:chorus_connection_id' as const,
        PLAYBACK: 'local:chorus_playback' as const,
        EFFECTS: 'local:chorus_audio_effects' as const,
        LOFI: 'local:chorus_lofi' as const
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
                } else {
                    window.postMessage({ type: data.type, data: data?.value }, '*')
                }
            }
        })
    }

    /** What the page is hearing now, read from the same storage its stores persist to. */
    async function currentPresetValues(): Promise<PresetValues> {
        const playback = await storage.getItem<PlaybackSettings>(STORE_KEYS.PLAYBACK)
        const effect = await storage.getItem<AudioEffect>(STORE_KEYS.EFFECTS)
        const lofi = await storage.getItem<EffectSettings>(STORE_KEYS.LOFI)
        return {
            playback: playback?.default ? effectivePlayback(playback) : defaultPlayback,
            effect: { ...defaultAudioEffect, ...(effect ?? {}) },
            lofi: normalizeEffectSettings(lofi)
        }
    }

    browser.runtime.onConnect.addListener(async (port) => {
        if (port.name !== 'popup') return

        port.onMessage.addListener(async (message) => {
            if (!isEnabled) return

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
    registerLyricsService()

    // ---- Real-time vocal remover: tab capture → offscreen document ----
    // The model runs in an offscreen doc (off the page thread). Tab audio is piped
    // straight into it via tabCapture (Chrome can't message raw audio). Control
    // messages (start/stop/params) are small JSON, which messaging handles fine.
    async function ensureOffscreen() {
        if (!chrome.offscreen) throw new Error('offscreen API unavailable (Chrome only)')
        try {
            if (await chrome.offscreen.hasDocument()) return
        } catch {
            // hasDocument unsupported on this version — fall through and create
        }
        try {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['USER_MEDIA' as chrome.offscreen.Reason],
                justification: 'Capture and process tab audio for real-time vocal removal.'
            })
        } catch {
            // already exists — fine
        }
    }

    // Serialize start/stop so getMediaStreamId never runs while a stream is live,
    // and last-write-wins so the user's most recent toggle is the one that sticks.
    let vocalEpoch = 0
    let vocalChain: Promise<void> = Promise.resolve()
    function enqueueVocal(fn: (epoch: number) => Promise<void>): Promise<void> {
        const epoch = ++vocalEpoch
        vocalChain = vocalChain.then(() => fn(epoch)).catch(() => {})
        return vocalChain
    }

    function safePost(port: chrome.runtime.Port, msg: unknown) {
        try {
            port.postMessage(msg)
        } catch {
            // port already closed (popup navigated/closed)
        }
    }

    async function startVocalCapture(tabId: number, mix?: unknown) {
        // Release any capture still held by the offscreen doc first. getMediaStreamId
        // rejects with "Cannot capture a tab with an active stream" if one is live —
        // which happens when the popup was reopened while a prior capture kept running.
        await ensureOffscreen()
        await chrome.runtime.sendMessage({ target: 'offscreen', cmd: 'stop' }).catch(() => {})

        console.log('[chorus] bg: getMediaStreamId for tab', tabId)
        const streamId = await new Promise<string>((resolve, reject) => {
            // getMediaStreamId can hang if the tab isn't capturable yet — time it out
            // so the toggle fails cleanly (and a retry can succeed) instead of locking.
            const timer = setTimeout(
                () => reject(new Error('tab capture timed out — toggle off and on again')),
                4000
            )
            chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
                clearTimeout(timer)
                const err = chrome.runtime.lastError
                if (err) reject(new Error(err.message))
                else resolve(id)
            })
        })
        console.log('[chorus] bg: streamId ok, sending start')
        // Bound the offscreen start: model warmup / session-create can hang (slow GPU
        // init, first-run load). Because starts are serialized, a hung one would wedge
        // the whole chain so even a later OFF could never run — time it out to free it.
        const resp: any = await Promise.race([
            chrome.runtime.sendMessage({
                target: 'offscreen',
                cmd: 'start',
                streamId,
                mix
            }),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error('vocal start timed out — toggle off and on again')),
                    20000
                )
            )
        ])
        console.log('[chorus] bg: offscreen start response:', resp)
        // Surface an offscreen-side failure so the UI doesn't show OFF while a
        // half-built capture lingers (and the next ON hits an active stream).
        if (resp?.error) throw new Error(resp.error)
        return resp
    }

    // Dedicated port (not runtime.onMessage) so the @webext-core proxy-service
    // message validator never sees these control messages.
    browser.runtime.onConnect.addListener((port) => {
        if (port.name !== 'vocal') return

        port.onMessage.addListener((msg: any) => {
            if (msg?.cmd === 'start') {
                // Queued so it can't interleave with another start/stop. Resolve the
                // Spotify tab ourselves so this works from the popup (no sender tab).
                enqueueVocal(async (epoch) => {
                    const tab = await getActiveTab()
                    if (!tab?.id) {
                        safePost(port, {
                            type: 'status',
                            text: 'no active Spotify tab',
                            error: true
                        })
                        return
                    }
                    try {
                        await startVocalCapture(tab.id, msg.mix)
                    } catch (e: any) {
                        safePost(port, {
                            type: 'status',
                            text: String(e?.message ?? e),
                            error: true
                        })
                        return
                    }
                    if (epoch !== vocalEpoch) {
                        // A newer toggle arrived while we were starting — roll back so
                        // the user's latest intent (off / a different tab) wins.
                        await chrome.runtime
                            .sendMessage({ target: 'offscreen', cmd: 'stop' })
                            .catch(() => {})
                        return
                    }
                    safePost(port, { type: 'status', text: 'active' })
                })
            } else if (msg?.cmd === 'stop') {
                enqueueVocal(async () => {
                    await chrome.runtime
                        .sendMessage({ target: 'offscreen', cmd: 'stop' })
                        .catch(() => {})
                    safePost(port, { type: 'status', text: 'off' })
                })
            } else if (msg?.cmd === 'setMix') {
                chrome.runtime
                    .sendMessage({ target: 'offscreen', cmd: 'setMix', mix: msg.mix })
                    .catch(() => {})
            } else if (msg?.cmd === 'getState') {
                // Reflect the real capture state back to the popup so it doesn't try to
                // start a capture that's already running. Don't spin up an offscreen doc
                // just to answer — no doc means nothing is capturing.
                ;(async () => {
                    let state: {
                        capturing: boolean
                        mix: { vocals: number; instruments: number }
                    } = {
                        capturing: false,
                        mix: { vocals: 0, instruments: 1 }
                    }
                    try {
                        if (chrome.offscreen && (await chrome.offscreen.hasDocument())) {
                            const s: any = await chrome.runtime.sendMessage({
                                target: 'offscreen',
                                cmd: 'getState'
                            })
                            // Single global capture: report it as-is. (Per-tab gating
                            // caused false-offs when another Spotify tab was active.)
                            if (s) state = s
                        }
                    } catch {
                        // no offscreen / no response → treat as not capturing
                    }
                    safePost(port, { type: 'state', ...state })
                })()
            } else if (msg?.cmd === 'getStats') {
                ;(async () => {
                    const s = await chrome.runtime
                        .sendMessage({ target: 'offscreen', cmd: 'getStats' })
                        .catch(() => null)
                    if (s) safePost(port, { type: 'stats', data: s })
                })()
            }
        })
    })

    browser.webRequest.onBeforeRequest.addListener(
        (details) => {
            try {
                const rawBody = details?.requestBody?.raw?.at(0)?.bytes
                if (!rawBody) return

                const text = new TextDecoder('utf-8').decode(new Uint8Array(rawBody))
                const data = JSON.parse(text)

                if (!data?.device?.device_id || !data?.connection_id) return

                // Defer the write until the persisted flag is known, then re-check.
                // Avoids harvesting while OFF during the cold-SW-start window, without
                // dropping the first request on the enabled path.
                readyPromise.then(() => {
                    if (!isEnabled) return
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
                })
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
            // Defer all harvesting until the persisted flag is known, then re-check —
            // closes the cold-SW-start window where a request could be scraped while OFF.
            readyPromise.then(() => {
                if (!isEnabled) return

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
            })
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

    browser.commands.onCommand.addListener(async (command) => {
        if (command === 'on/off') {
            // Master toggle: flips the persisted flag; the content script watches
            // this key and injects or tears down all Chorus features in response.
            // watchEnabled (above) updates isEnabled + the toolbar icon.
            await toggleEnabled()
            return
        }

        // Every other command is a Chorus action — no-op while disabled.
        if (!isEnabled) return

        if (
            !command.startsWith('cycle-theme-') &&
            !command.startsWith('audio-preset-') &&
            !command.startsWith('quick-preset-') &&
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
                theme: { ...settings.theme, name: nextTheme },
                ui: { ...settings.ui, theme: nextTheme !== 'spotify' }
            })
        }

        // Preset slot N toggles the user's Nth preset; next/previous walk the
        // built-ins (minus hidden ones) and then the user's own. The page applies
        // whatever is sent by writing its stores, so the UI stays in step.
        if (command.startsWith('audio-preset-') || command.startsWith('quick-preset-')) {
            const config = await storage.getItem<ConfigState>(STORE_KEYS.CONFIG)
            const mine = config?.audio_presets ?? []
            const current = await currentPresetValues()

            let message: QuickPresetMessage | null = null
            if (command.startsWith('audio-preset-')) {
                const preset = mine[Number(command.split('-').at(-1)) - 1]
                if (!preset) return
                message = sameValues(current, preset)
                    ? { values: NORMAL_VALUES, id: null }
                    : { values: preset, id: preset.id }
            } else {
                const hidden = config?.fx_eq_presets?.quick_presets ?? []
                const ring = [...QUICK_PRESETS.filter((p) => !hidden.includes(p.id)), ...mine]
                if (ring.length === 0) return
                const playing = matchPreset(current, ring)
                const index = playing ? ring.indexOf(playing) : -1
                const next = command.endsWith('-next')
                    ? ring[(index + 1) % ring.length]
                    : ring[(index <= 0 ? ring.length : index) - 1]
                message = { values: next, id: next.id }
            }

            await executeScript({ type: QUICK_PRESET_EVENT, data: message })
        }

        if (['toggle-new-releases', 'toggle-config'].includes(command)) {
            await executeButtonClick({ command, isShortCutKey: true })
        }
    })
})
