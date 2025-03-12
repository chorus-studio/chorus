import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

export type Playback = {
    playback_rate: number
    preserves_pitch: boolean
}

type PlaybackSettings = {
    default: Playback
    track: Playback
    is_default: boolean
}

const defaultPlaybackSettings: PlaybackSettings = {
    default: {
        playback_rate: 1.0,
        preserves_pitch: true
    },
    track: {
        playback_rate: 1.0,
        preserves_pitch: true
    },
    is_default: true
}

function createPlaybackStore() {
    const store = writable<PlaybackSettings>(defaultPlaybackSettings)
    const { subscribe, set, update } = store

    function dispatchPlaybackSettings(playback?: Playback) {
        const state = get(store)

        const data = playback ?? {
            playback_rate: state.is_default
                ? state.default.playback_rate
                : state.track.playback_rate,
            preserves_pitch: state.is_default
                ? state.default.preserves_pitch
                : state.track.preserves_pitch
        }
        window.postMessage({ type: 'FROM_PLAYBACK_LISTENER', data: data }, '*')
    }

    async function updatePlayback(playback: Partial<PlaybackSettings>) {
        update((state) => ({ ...state, ...playback }))
        const newState = get(store)
        await storage.setItem<PlaybackSettings>('local:chorus_playback_settings', newState)
        dispatchPlaybackSettings()
    }

    async function reset() {
        set(defaultPlaybackSettings)
        await storage.setItem<PlaybackSettings>(
            'local:chorus_playback_settings',
            defaultPlaybackSettings
        )
        dispatchPlaybackSettings()
    }

    storage
        .getItem<PlaybackSettings>('local:chorus_playback_settings', {
            fallback: defaultPlaybackSettings
        })
        .then((newValues) => {
            if (newValues) set(newValues)
        })

    return {
        reset,
        update,
        subscribe,
        updatePlayback,
        dispatchPlaybackSettings
    }
}

export const playbackStore = createPlaybackStore()
