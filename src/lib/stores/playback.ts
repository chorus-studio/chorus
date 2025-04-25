import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

export type Playback = {
    rate: number
    pitch: number
    semitone: number
}

export type SoundTouchData = Pick<Playback, 'pitch' | 'semitone'>
export type Frequent = { value: number; pinned: boolean }

type PlaybackSettings = {
    default: Playback
    track: Playback
    frequents: {
        pitch: Frequent[]
        rate: Frequent[]
        semitone: Frequent[]
    }
    is_default: boolean
}

export const defaultPlayback: Playback = { rate: 1, pitch: 1, semitone: 0 }

const STORAGE_KEY = 'local:chorus_playback'

const defaultPlaybackSettings: PlaybackSettings = {
    is_default: true,
    track: defaultPlayback,
    default: defaultPlayback,
    frequents: {
        pitch: [
            { value: 0.25, pinned: false },
            { value: 0.5, pinned: false },
            { value: 0.75, pinned: false },
            { value: 1, pinned: false },
            { value: 1.25, pinned: false }
        ],
        rate: [
            { value: 0.5, pinned: false },
            { value: 0.9818, pinned: false },
            { value: 1, pinned: false },
            { value: 1.2, pinned: false },
            { value: 2, pinned: false }
        ],
        semitone: [
            { value: -2, pinned: false },
            { value: -1, pinned: false },
            { value: 0, pinned: false },
            { value: 1, pinned: false },
            { value: 2, pinned: false }
        ]
    }
}

function createPlaybackStore() {
    const store = writable<PlaybackSettings>(defaultPlaybackSettings)
    const { subscribe, set, update } = store

    function dispatchPlaybackSettings(playback?: Playback) {
        const state = get(store)
        const data = playback ?? (state.is_default ? state.default : state.track)
        window.postMessage({ type: 'FROM_PLAYBACK_LISTENER', data }, '*')
    }

    async function updatePlayback(playback: Partial<PlaybackSettings>) {
        update((state) => ({ ...state, ...playback }))
        const newState = get(store)
        await storage.setItem<PlaybackSettings>(STORAGE_KEY, newState)
        dispatchPlaybackSettings()
    }

    async function reset() {
        set(defaultPlaybackSettings)
        await storage.setItem<PlaybackSettings>(STORAGE_KEY, defaultPlaybackSettings)
        dispatchPlaybackSettings()
    }

    async function addFrequentValue(key: keyof Playback, value: number) {
        update((state) => {
            const frequents = state.frequents[key]
            const existingIndex = frequents.findIndex((f) => f.value === value)

            if (existingIndex !== -1) {
                // Value already exists, just update its pinned status
                frequents[existingIndex] = { value, pinned: frequents[existingIndex].pinned }
                return state
            }

            if (frequents.length < 5) {
                // If we have space, add the new value unpinned
                frequents.push({ value, pinned: false })
            } else {
                // Find the first unpinned value to replace
                const unpinnedIndex = frequents.findIndex((f) => !f.pinned)
                if (unpinnedIndex !== -1) {
                    frequents[unpinnedIndex] = { value, pinned: false }
                }
            }

            return { ...state, frequents: { ...state.frequents, [key]: frequents } }
        })
        const newState = get(store)
        await storage.setItem<PlaybackSettings>(STORAGE_KEY, newState)
    }

    async function togglePin(key: keyof Playback, value: number) {
        update((state) => {
            const frequents = state.frequents[key]
            const index = frequents.findIndex((f) => f.value === value)
            if (index !== -1) {
                frequents[index] = { value, pinned: !frequents[index].pinned }
            }
            return { ...state, frequents: { ...state.frequents, [key]: frequents } }
        })
        const newState = get(store)
        await storage.setItem<PlaybackSettings>(STORAGE_KEY, newState)
    }

    storage
        .getItem<PlaybackSettings>(STORAGE_KEY, {
            fallback: defaultPlaybackSettings
        })
        .then((newValues) => {
            if (newValues) set(newValues)
        })

    storage.watch(STORAGE_KEY, (newValues) => {
        if (newValues) store.set(newValues as PlaybackSettings)
    })

    return {
        reset,
        togglePin,
        subscribe,
        updatePlayback,
        addFrequentValue,
        dispatchPlaybackSettings
    }
}

export const playbackStore = createPlaybackStore()
