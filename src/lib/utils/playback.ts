import { timeToSeconds } from './time'

export const playback = {
    loop: () => {
        const loopButton = document.querySelector('[data-testid="control-button-repeat"]')
        if (!loopButton) return false

        return loopButton.getAttribute('aria-label') === 'Disable repeat one'
    },
    duration: () => {
        const getPlaybackDuration = () =>
            document.querySelector('[data-testid="playback-duration"]')
        const playbackDuration = getPlaybackDuration()?.textContent
        if (!playbackDuration) return 0

        return timeToSeconds(playbackDuration)
    },

    current: () => {
        const getPlaybackPosition = () =>
            document.querySelector('[data-testid="playback-position"]')
        const playbackPosition = getPlaybackPosition()?.textContent
        if (!playbackPosition) return 0

        return timeToSeconds(playbackPosition)
    },
    data: () => {
        const duration = playback.duration()
        const position = playback.current()
        const loop = playback.loop()
        return { duration, position, loop }
    }
}
