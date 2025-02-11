import { timeToSeconds } from './time.js'

export const playback = {
    duration: () => {
        const getPlaybackDuration = () =>
            document.querySelector('[data-testid="playback-duration"]')
        const playbackDuration = getPlaybackDuration()?.textContent

        return timeToSeconds(playbackDuration)
    },

    current: () => {
        const getPlaybackPosition = () =>
            document.querySelector('[data-testid="playback-position"]')
        const playbackPosition = getPlaybackPosition()?.textContent

        return timeToSeconds(playbackPosition)
    }
}
