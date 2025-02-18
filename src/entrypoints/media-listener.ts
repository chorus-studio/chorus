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

            document.addEventListener('FROM_CHORUS_EXTENSION', (event: CustomEvent) => {
                const { type, data } = event.detail
                if (type === 'playback_settings') {
                    updatePlaybackSettings(data)
                } else if (type === 'seek') {
                    updateSeek(data)
                } else if (type === 'audio_effect') {
                    console.log('FROM_CHORUS_EXTENSION', data)
                    updateAudioEffect(data)
                }
            })
        }

        setupMediaListener()
        return true
    }
})
