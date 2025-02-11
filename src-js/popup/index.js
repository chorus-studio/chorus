import { extToggle } from './toggle.js'
import { extControls } from './controls.js'
import { createRootContainer } from './ui.js'

import { activeOpenTab } from '../utils/messaging.js'
import { setTrackInfo } from '../utils/track-info.js'
import { parseNodeString } from '../utils/parser.js'
import { getState, setState } from '../utils/state.js'
import { getImageBackgroundAndTextColours } from '../utils/image-colours.js'

const PORT = chrome.runtime.connect({ name: 'popup' })

async function initializeUI({ active, enabled, callback }) {
    await extToggle.initialize({ enabled, callback })
    extControls.initialize(PORT)
    extControls.updateControlsState(active)
}

PORT.onMessage.addListener(async ({ type, data }) => {
    if (!['enabled', 'now-playing', 'controls', 'state', 'ui-state'].includes(type)) return

    if (type == 'now-playing' && (!data || data == {})) return
    await setCoverImage(data)

    if (type == 'controls') extControls.updateIcons({ type, ...data })
    if (type == 'state') {
        extControls.updateUIState({ type, data })
        const popupState = await getState('popup-ui')
        await setState({ key: 'popup-ui', values: { ...popupState, controls: data } })
    }

    if (type == 'ui-state') {
        const enabled = await getState('enabled')
        await initializeUI({ active: data.active, enabled, callback: loadExtOffState })
    }
})

async function updatePopupUIState(popupState) {
    await setState({ key: 'popup-ui', values: popupState })
}

async function updatePopupUI({ src, title, artists, textColour, backgroundColour }) {
    const { cover, chorusPopup } = getElements()

    chorusPopup.style.backgroundColor = backgroundColour
    extControls.setFill({ textColour, backgroundColour })

    cover.src = src

    setTrackInfo({ title, artists, textColour })
    await updatePopupUIState({ title, artists, textColour, src, backgroundColour })
}

function setExtFillColours({ textColour, backgroundColour }) {
    extToggle.setFill(textColour)
    extControls.setFill({ textColour, backgroundColour })
}

async function setCoverImage({ cover, title, artists }) {
    const { double } = getElements()
    if (!double || !cover) return

    await loadImage({ url: cover, elem: double })
    if (double.complete) {
        const { textColour, backgroundColour } = getImageBackgroundAndTextColours(double)
        await updatePopupUI({ src: cover, title, artists, textColour, backgroundColour })
        setExtFillColours({ textColour, backgroundColour })
    }
}

async function loadImage({ url, elem }) {
    return new Promise((resolve, reject) => {
        elem.src = url
        elem.crossOrigin = 'Anonymous'
        elem.style.transform = 'unset'

        elem.onload = () => resolve(elem)
        elem.onerror = reject
    })
}

function getElements() {
    return {
        cover: document.getElementById('cover'),
        double: document.getElementById('double'),
        chorusPopup: document.getElementById('chorus')
    }
}

function loadImageData({ src, title, artists, backgroundColour, textColour }) {
    const { cover, chorusPopup } = getElements()

    cover.src = src
    chorusPopup.style.backgroundColor = backgroundColour
    setExtFillColours({ textColour, backgroundColour })
    setTrackInfo({ title, artists, textColour })
}

async function setupFromStorage() {
    const data = await getState('popup-ui')
    if (!data) return { data: null, loaded: false }

    loadImageData(data)
    data?.controls && extControls.updateUIState({ type: 'state', data: data.controls })
    return { loaded: true, data }
}

function loadDefaultUI({ enabled, active }) {
    const { chorusPopup, cover } = getElements()

    cover.src = chrome.runtime.getURL('../icons/logo.png')
    cover.style.transform = 'scale(1.15)'

    const title =
        enabled && !active
            ? 'No Active Spotify Tab Open'
            : !enabled
              ? 'Chorus Toggled Off. Turn On To Enhance Spotify.'
              : ''

    const artists =
        enabled && !active ? 'Open Spotify Tab' : !enabled ? 'Chorus - Spotify Enhancer' : ''

    if (artists && title) setTrackInfo({ title, artists })

    chorusPopup.style.backgroundColor = '#1ED760'

    setExtFillColours({ textColour: '#000', backgroundColour: '#1ED760' })
    extControls.updateControlsState(active && enabled)
}

async function loadExtOffState(enabled) {
    const { active } = await activeOpenTab()
    const displayMediaUI = active && enabled
    if (!active || !enabled || !displayMediaUI) return loadDefaultUI({ active, enabled })

    const { cover } = getElements()
    const { data, loaded } = await setupFromStorage()
    const currentData = await getState('now-playing')

    if (!data && !currentData) return loadDefaultUI({ active, enabled })

    cover.style.transform = 'unset'
    extControls.updateControlsState(active && currentData)
    if (loaded & (data?.title == currentData?.title)) return setExtFillColours(data)

    if (!currentData?.isSkipped) await setCoverImage(currentData)
}

function placeIcons() {
    const root = createRootContainer()
    const rootEl = parseNodeString(root)
    document.body.appendChild(rootEl)
    extToggle.setupEvents(loadExtOffState)
}

async function loadInitialData() {
    const { active } = await activeOpenTab()
    const enabled = await getState('enabled')
    const { data, loaded } = await setupFromStorage()
    const currentData = await getState('now-playing')

    const mediaUIDisplay = active && enabled

    await initializeUI({ enabled, active, callback: loadExtOffState })

    if (!data && !currentData) return loadDefaultUI({ active, enabled })
    if (mediaUIDisplay && loaded & (data?.title == currentData?.title))
        return setExtFillColours(data)

    if (mediaUIDisplay && !currentData?.isSkipped) await setCoverImage(currentData)
}

placeIcons()
loadInitialData()
