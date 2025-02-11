import { mediaCapture } from './media-capture'

function getMediaPlayer() {
    if (window?.mediaPlayer) return window.mediaPlayer

    const mediaPlayer = mediaCapture.mediaPlayer
    window.mediaPlayer = mediaPlayer
    return mediaPlayer
}

function sendMessage(message) {
    document.dispatchEvent(new CustomEvent('aria_response', { detail: message }))
}

function setupAriaEventListeners() {
    // Add event listener to document
    document.addEventListener('aria', async (event) => {
        const { action, data } = event.detail
        const mediaPlayer = getMediaPlayer()

        if (!mediaPlayer) return

        const messageTypes = {
            ARIA_SET_EFFECT: (data) => mediaPlayer.setEffect(data),
            ARIA_SET_EFFECTS: (data) => mediaPlayer.applyEffects(data.audioEffects),
            ARIA_CLEAR_EFFECTS: () => mediaPlayer.clearAllEffects(),
            ARIA_DISCONNECT_EFFECTS: () => mediaPlayer.disconnectEffects(),
            ARIA_NEXT: () => mediaPlayer.next(),
            ARIA_PREVIOUS: () => mediaPlayer.previous(),
            ARIA_PLAY_PAUSE: () => mediaPlayer.togglePlayPause(),
            ARIA_MUTE_TOGGLE: () => mediaPlayer.toggleMute(),
            ARIA_SET_VOLUME: (data) => mediaPlayer.setVolume(data.value),
            ARIA_SEEK_POSITION: (data) => mediaPlayer.seekTo(data.value),
            ARIA_RESTART: () => mediaPlayer.seekTo(0),
            ARIA_SEEK: (data) => mediaPlayer.seekOffset(data.value),
            ARIA_MANUAL_PLAY_PAUSE: () => mediaPlayer.manualPlayPause()
        }

        try {
            messageTypes[action]?.(data)

            if (action === 'ARIA_TAB_CAPTURE_REQUIRED') {
                sendMessage({
                    action,
                    data: mediaPlayer?.element?.getAttribute('src')
                })
            }

            sendMessage({ action: 'ARIA_STATE_UPDATED', data: mediaPlayer.state })
        } catch (error) {
            sendMessage({ action: 'ARIA_ERROR', data: error.message })
        }
    })
}

function initExtension() {
    // const mediaPlayer = mediaCapture.mediaPlayer
    setupAriaEventListeners()

    // const setup = setInterval(() => {
    //     if (!window.mediaPlayer) return
    //     clearInterval(setup)
    // }, 250)
}

export default defineUnlistedScript({
    main() {
        initExtension()
        return true
    }
})
