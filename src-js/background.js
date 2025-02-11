import { setState, getState } from './utils/state.js'
import { mediaKeys, chorusKeys } from './utils/selectors.js'
import { activeOpenTab, sendMessage } from './utils/messaging.js'

import { getQueueList, setQueueList } from './services/queue.js'
import { createArtistDiscoPlaylist } from './services/artist-disco.js'
import { playSharedTrack, seekTrackToPosition } from './services/player.js'
import { checkIfTracksInCollection, updateLikedTracks, getAlbum } from './services/track.js'

let ENABLED = true
let popupPort = null

async function getUIState({ selector, tabId, delay = 0 }) {
    const [result] = await chrome.scripting.executeScript({
        args: [selector, delay],
        target: { tabId },
        func: (selector, delay) =>
            new Promise((resolve) => {
                setTimeout(() => {
                    resolve(
                        document.querySelector(selector)?.getAttribute('aria-label').toLowerCase()
                    )
                }, delay)
            })
    })

    return result?.result
}

async function getMediaControlsState(tabId) {
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
    const selectors = requiredKeys.map((key) => selectorKeys[key] ?? undefined).filter(Boolean)

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
    const state = results.map((item, idx) => ({ data: item.value, key: requiredKeys[idx] }))
    return state
}

async function setMediaState({ active, tabId }) {
    popupPort.postMessage({ type: 'ui-state', data: { active } })

    if (!active) return

    const state = await getMediaControlsState(tabId)
    return popupPort.postMessage({ type: 'state', data: state })
}

chrome.runtime.onConnect.addListener(async (port) => {
    if (port.name !== 'popup') return

    popupPort = port
    const { active, tabId } = await activeOpenTab()
    await setMediaState({ active, tabId })

    port.onMessage.addListener(async (message) => {
        if (message?.type !== 'controls') return

        const { selector, tabId } = await executeButtonClick({ command: message.key })

        const delay = selector.includes('heart') ? 500 : 0
        const result = await getUIState({ selector, tabId, delay })

        port.postMessage({ type: 'controls', data: { key: message.key, result } })
    })

    port.onDisconnect.addListener(() => (popupPort = null))
})

function setBadgeInfo(enabled = true) {
    chrome.action.setBadgeText({ text: enabled ? 'on' : 'off' })
    chrome.action.setBadgeTextColor({ color: 'white' })
    chrome.action.setBadgeBackgroundColor({ color: enabled ? '#1ed760' : 'gray' })
}

chrome.runtime.onInstalled.addListener(async () => {
    const result = await setState({ key: 'enabled', values: true })
    if (!result?.error) setBadgeInfo(true)
})

function updateBadgeState({ changes, changedKey }) {
    if (changedKey != 'enabled') return

    const { newValue, oldValue } = changes.enabled
    ENABLED = newValue ?? !oldValue
    setBadgeInfo(ENABLED)
}

chrome.storage.onChanged.addListener(async (changes) => {
    const keys = Object.keys(changes)
    const changedKey = keys.find((key) =>
        ['now-playing', 'enabled', 'auth_token', 'device_id', 'connection_id'].includes(key)
    )

    if (!changedKey) return

    updateBadgeState({ changes, changedKey })

    if (changedKey == 'now-playing' && ENABLED) {
        if (popupPort) {
            const { active, tabId } = await activeOpenTab()
            active &&
                popupPort.postMessage({ type: changedKey, data: changes[changedKey].newValue })
            await setMediaState({ active, tabId })
        }
    }

    const messageValue =
        changedKey == 'enabled' ? changes[changedKey] : changes[changedKey].newValue
    sendMessage({ message: { [changedKey]: messageValue } })
})

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        const rawBody = details?.requestBody?.raw?.at(0)?.bytes
        if (!rawBody) return

        const text = new TextDecoder('utf-8').decode(new Uint8Array(rawBody))
        const data = JSON.parse(text)
        chrome.storage.local.set({
            device_id: data.device.device_id.toString(),
            connection_id: data.connection_id.toString()
        })
    },
    { urls: ['https://guc3-spclient.spotify.com/track-playback/v1/devices'] },
    ['requestBody']
)

function getTrackId(url) {
    const query = new URL(url)
    const params = new URLSearchParams(query.search)
    const variables = params.get('variables')
    const uris = JSON.parse(decodeURIComponent(variables)).uris.at(0)
    return uris.split('track:').at(-1)
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    async (details) => {
        if (details.url.includes('areEntitiesInLibrary')) {
            const nowPlaying = await getState('now-playing')
            if (!nowPlaying) return
            if (nowPlaying?.trackId) return

            nowPlaying.trackId = getTrackId(details.url)
            chrome.storage.local.set({ 'now-playing': nowPlaying })
        }

        const authHeader = details?.requestHeaders?.find(
            (header) => header?.name == 'authorization'
        )
        if (!authHeader) return

        chrome.storage.local.set({ auth_token: authHeader?.value })
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

function promiseHandler(promise, sendResponse) {
    promise
        .then((result) => sendResponse({ state: 'completed', data: result }))
        .catch((error) => sendResponse({ state: 'error', error: error.message }))
}

chrome.runtime.onMessage.addListener(({ key, values }, _, sendResponse) => {
    const messageHandler = {
        'queue.set': setQueueList,
        'queue.get': getQueueList,
        'play.shared': playSharedTrack,
        'play.seek': seekTrackToPosition,
        'tracks.album': getAlbum,
        'tracks.update': updateLikedTracks,
        'tracks.liked': checkIfTracksInCollection,
        'artist.disco': createArtistDiscoPlaylist
    }

    const handlerFn = messageHandler[key]
    handlerFn
        ? promiseHandler(handlerFn(values), sendResponse)
        : sendResponse({ state: 'error', error: 'key not not configured' })
    return true
})

async function executeButtonClick({ command, isShortCutKey = false }) {
    const { active, tabId } = await activeOpenTab()
    if (!active) return

    if (command == 'on/off') {
        const enabled = await getState('enabled')
        return chrome.storage.local.set({ enabled: !enabled })
    }

    const selector = chorusKeys[command] || mediaKeys[command]
    const isChorusCommand = Object.keys(chorusKeys).includes(command)

    if (isShortCutKey && !ENABLED && isChorusCommand) return

    await chrome.scripting.executeScript({
        args: [selector],
        target: { tabId },
        func: (selector) => document.querySelector(selector)?.click()
    })

    if (!isShortCutKey) return { selector, tabId }
}

chrome.commands.onCommand.addListener(
    async (command) => await executeButtonClick({ command, isShortCutKey: true })
)
