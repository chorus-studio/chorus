import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

// Debounced storage writer to batch rapid updates
let storageWriteTimeout: NodeJS.Timeout | null = null
function debouncedStorageWrite<T>(key: `local:${string}` | `session:${string}` | `sync:${string}` | `managed:${string}`, value: T, delay: number = 100) {
    if (storageWriteTimeout) {
        clearTimeout(storageWriteTimeout)
    }
    return new Promise<void>((resolve) => {
        storageWriteTimeout = setTimeout(async () => {
            try {
                await storage.setItem(key, value)
                resolve()
            } catch (error) {
                console.error('Error writing to storage:', error)
                resolve()
            }
        }, delay)
    })
}

export type Rate = {
    value: number
    preserves_pitch: boolean
}

export type Playback = {
    rate: Rate
    pitch: number
    semitone: number
}

export type SoundTouchData = Omit<Playback, 'rate'>
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

export const defaultPlayback: Playback = {
    rate: { value: 1, preserves_pitch: true },
    pitch: 1,
    semitone: 0
}

const PLAYBACK_STORE_KEY = 'local:chorus_playback'

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
    let isUpdatingStorage = false

    function dispatchPlaybackSettings(playback?: Playback) {
        const state = get(store)
        const data = playback ?? (state.is_default ? state.default : state.track)
        window.postMessage({ type: 'FROM_PLAYBACK_LISTENER', data }, '*')
    }

    async function updatePlayback(playback: Partial<PlaybackSettings>) {
        update((state) => ({ ...state, ...playback }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await debouncedStorageWrite(PLAYBACK_STORE_KEY, newState)
        } finally {
            isUpdatingStorage = false
        }
        dispatchPlaybackSettings()
    }

    async function reset() {
        set(defaultPlaybackSettings)
        isUpdatingStorage = true
        try {
            await storage.setItem<PlaybackSettings>(PLAYBACK_STORE_KEY, defaultPlaybackSettings)
        } catch (error) {
            console.error('Error resetting playback in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
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
        isUpdatingStorage = true
        try {
            await debouncedStorageWrite(PLAYBACK_STORE_KEY, newState)
        } finally {
            isUpdatingStorage = false
        }
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
        isUpdatingStorage = true
        try {
            await debouncedStorageWrite(PLAYBACK_STORE_KEY, newState)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage
        .getItem<PlaybackSettings>(PLAYBACK_STORE_KEY, {
            fallback: defaultPlaybackSettings
        })
        .then((newValues) => {
            if (!newValues) return

            // Sync the stored playback settings with the current type definition
            const syncedValues = syncWithType(newValues, defaultPlaybackSettings)
            set(syncedValues)

            // Update storage with synced values
            isUpdatingStorage = true
            storage
                .setItem<PlaybackSettings>(PLAYBACK_STORE_KEY, syncedValues)
                .then(() => {
                    isUpdatingStorage = false
                })
                .catch((error) => {
                    console.error('Error updating storage:', error)
                    isUpdatingStorage = false
                })
        })

    storage.watch<PlaybackSettings>(PLAYBACK_STORE_KEY, (newValues) => {
        if (!newValues || isUpdatingStorage) return

        const syncedValues = syncWithType(newValues, defaultPlaybackSettings)
        set(syncedValues)
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
