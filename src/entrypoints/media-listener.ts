type Playback = {
    playbackRate: number
    preservesPitch: boolean
}

type PlaybackSettings = {
    default: Playback
    track: Playback
    is_default: boolean
}

type Seek = {
    type: 'skip_back' | 'skip_forward'
    value: number
}

export default defineUnlistedScript({
    main() {
        async function setupMediaListener() {
            function updatePlaybackSettings(playbackSettings: PlaybackSettings) {
                document.dispatchEvent(
                    new CustomEvent('FROM_PLAYBACK_LISTENER', { detail: playbackSettings })
                )
            }

            function updateSeek(seek: Seek) {
                document.dispatchEvent(new CustomEvent('FROM_SEEK_LISTENER', { detail: seek }))
            }

            function updateAudioEffect(effect: { reverb?: string; eq?: string }) {
                document.dispatchEvent(new CustomEvent('FROM_EFFECTS_LISTENER', { detail: effect }))
            }

            function updateVolume(data: { value: number }) {
                document.dispatchEvent(new CustomEvent('FROM_VOLUME_LISTENER', { detail: data }))
            }

            function updateMute(data: { value: boolean }) {
                document.dispatchEvent(new CustomEvent('FROM_MUTE_LISTENER', { detail: data }))
            }

            function updateCurrentTime(data: { value: number }) {
                document.dispatchEvent(
                    new CustomEvent('FROM_CURRENT_TIME_LISTENER', { detail: data })
                )
            }

            document.addEventListener('FROM_CHORUS_EXTENSION', (event: CustomEvent) => {
                const { type, data } = event.detail
                if (type === 'playback_settings') {
                    updatePlaybackSettings(data)
                } else if (type === 'seek') {
                    updateSeek(data)
                } else if (type === 'audio_effect') {
                    updateAudioEffect(data)
                } else if (type === 'volume') {
                    updateVolume(data)
                } else if (type === 'mute') {
                    updateMute(data)
                } else if (type === 'current_time') {
                    updateCurrentTime(data)
                }
            })
        }

        setupMediaListener()
        return true
    }
})
