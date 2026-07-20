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

    current: (): number | null => {
        const getPlaybackPosition = () =>
            document.querySelector('[data-testid="playback-position"]')
        const playbackPosition = getPlaybackPosition()?.textContent
        // An absent or unparsable position node must read as "unknown" (null),
        // never 0. During Spotify's now-playing-bar element swaps the node
        // vanishes for a few ticks, and a literal 0 would make the snip poll
        // in TrackObserver yank playback back to the snip start.
        if (!playbackPosition) return null

        const seconds = timeToSeconds(playbackPosition)
        return typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0
            ? seconds
            : null
    },
    data: () => {
        const duration = playback.duration()
        // Display consumers (now-playing store) keep the legacy 0 fallback;
        // only the seeking poll needs to distinguish "unknown" from 0:00.
        const position = playback.current() ?? 0
        const loop = playback.loop()
        return { duration, position, loop }
    }
}
