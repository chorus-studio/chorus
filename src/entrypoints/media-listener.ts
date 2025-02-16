import { storage } from '@wxt-dev/storage'
import { getState, setState } from '$lib/utils/state'

type PlaybackSettings = {
    playbackRate: number
    preservesPitch: boolean
    volume: number
    muted: boolean
}

type Seek = {
    type: 'skip_back' | 'skip_forward'
    value: number
}

const defaultPlaybackSettings: PlaybackSettings = {
    playbackRate: 1,
    preservesPitch: true,
    volume: 1,
    muted: false
}

export default defineUnlistedScript({
    main() {
        async function setupMediaListener() {
            function updatePlaybackSettings(playbackSettings: any) {
                document.dispatchEvent(
                    new CustomEvent('FROM_SPEED_LISTENER', { detail: playbackSettings })
                )
            }

            function updateSeek(seek: Seek) {
                document.dispatchEvent(new CustomEvent('FROM_SEEK_LISTENER', { detail: seek }))
            }

            let playbackSettings = await getState('chorus_playback_settings')
            if (!playbackSettings) {
                playbackSettings = defaultPlaybackSettings
                await setState({ key: 'chorus_playback_settings', values: defaultPlaybackSettings })
            }

            updatePlaybackSettings(playbackSettings)

            document.addEventListener('FROM_CHORUS_EXTENSION', (event: CustomEvent) => {
                const { type, data } = event.detail
                if (type === 'playback_settings') {
                    updatePlaybackSettings(data)
                } else if (type === 'seek') {
                    updateSeek(data)
                }
            })

            storage.watch<PlaybackSettings>('local:chorus_playback_settings', (newValues) => {
                if (!newValues) return

                updatePlaybackSettings({
                    muted: newValues.muted,
                    volume: newValues.volume,
                    playbackRate: newValues.playbackRate,
                    preservesPitch: newValues.preservesPitch
                })
            })
        }

        setupMediaListener()
        return true
    }
})
