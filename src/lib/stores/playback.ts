import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

type Playback = {
    playbackRate: number
    preservesPitch: boolean
}

type PlaybackSettings = {
    default: Playback
    track: Playback
    is_default: boolean
}

const defaultPlaybackSettings: PlaybackSettings = {
    default: {
        playbackRate: 1.0,
        preservesPitch: true
    },
    track: {
        playbackRate: 1.0,
        preservesPitch: true
    },
    is_default: true
}

function createPlaybackStore() {
    const store = writable<PlaybackSettings>(defaultPlaybackSettings)
    const { subscribe, set, update } = store

    async function toggleDefault() {
        update((state) => ({ ...state, is_default: !state.is_default }))
        const newState = get(store)
        await storage.setItem<PlaybackSettings>('local:chorus_playback_settings', newState)
    }

    function dispatchPlaybackSettings() {
        document.dispatchEvent(
            new CustomEvent('FROM_CHORUS_EXTENSION', {
                detail: { type: 'playback_settings', data: get(store) }
            })
        )
    }

    async function setPlayback({
        key,
        value,
        type
    }: {
        key: keyof Playback
        value: number | boolean
        type: 'default' | 'track'
    }) {
        update((state) => ({ ...state, [type]: { ...state[type], [key]: value } }))
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
        subscribe,
        setPlayback,
        toggleDefault
    }
}

export const playbackStore = createPlaybackStore()
