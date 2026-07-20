import { timeToSeconds } from './time'

export const playback = {
    loop: () => {
        const loopButton = document.querySelector('[data-testid="control-button-repeat"]')
        if (!loopButton) return false

        return loopButton.getAttribute('aria-label') === 'Disable repeat one'
    },
    duration: (): number | null => {
        const getPlaybackDuration = () =>
            document.querySelector('[data-testid="playback-duration"]')
        const playbackDuration = getPlaybackDuration()?.textContent
        // Same null discipline as current(): absent node, "-:--" placeholders,
        // and Spotify's remaining-time display mode must all read as "unknown",
        // never as a real duration. Remaining-time is rejected on the raw string:
        // Number("-0") is -0, so "-0:45" would otherwise parse to +45 and slip
        // past a numeric sign check.
        if (!playbackDuration || playbackDuration.trim().startsWith('-')) return null

        const seconds = timeToSeconds(playbackDuration)
        // > 0, not >= 0: no real track is zero-length, and 0 is the store's
        // "never known" sentinel — a transient "0:00" must not overwrite the
        // preserved known-good value with the sentinel.
        return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
            ? seconds
            : null
    },

    current: (): number | null => {
        const getPlaybackPosition = () =>
            document.querySelector('[data-testid="playback-position"]')
        const playbackPosition = getPlaybackPosition()?.textContent
        // An absent or unparsable position node must read as "unknown" (null),
        // never 0. During Spotify's now-playing-bar element swaps the node
        // vanishes for a few ticks, and a literal 0 would make the snip poll
        // in TrackObserver yank playback back to the snip start. A leading "-"
        // is never a valid elapsed position, and Number("-0") is -0, so
        // "-0:45" would parse to +45 past the numeric sign check below.
        if (!playbackPosition || playbackPosition.trim().startsWith('-')) return null

        const seconds = timeToSeconds(playbackPosition)
        return typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0
            ? seconds
            : null
    },
    data: () => {
        // Duration passes through as null-when-unknown so the now-playing store
        // can keep its last known-good value instead of storing a poisoned 0.
        const duration = playback.duration()
        // Position keeps a 0 fallback: its only consumer is display, where a
        // transient 0 is harmless; the seeking poll calls current() directly.
        const position = playback.current() ?? 0
        const loop = playback.loop()
        return { duration, position, loop }
    }
}
