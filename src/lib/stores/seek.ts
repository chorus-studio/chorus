import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

type Seek = {
    rewind: number
    forward: number
}

type SeekData = {
    default: Seek
    long_form: Seek
    is_long_form: boolean
    media_type: 'default' | 'long_form'
}

const defaultSeekData: SeekData = {
    is_long_form: false,
    media_type: 'default',
    default: { rewind: 10, forward: 10 },
    long_form: { rewind: 30, forward: 30 }
}

const SEEK_STORE_KEY = 'local:chorus_seek'

function createSeekStore() {
    const store = writable<SeekData>(defaultSeekData)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    async function updateMediaType(type: 'default' | 'long_form') {
        update((prev: SeekData) => ({
            ...prev,
            media_type: type
        }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<SeekData>(SEEK_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating media type in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function updateSeek(state: Partial<SeekData>) {
        update((prev: SeekData) => ({
            ...prev,
            ...state
        }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<SeekData>(SEEK_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating seek in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage.getItem<SeekData>(SEEK_STORE_KEY, { fallback: defaultSeekData }).then((data) => {
        if (!data) return

        // Sync the stored seek data with the current type definition
        const syncedData = syncWithType(data, defaultSeekData)
        set(syncedData)

        // Update storage with synced data
        isUpdatingStorage = true
        storage
            .setItem<SeekData>(SEEK_STORE_KEY, syncedData)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    storage.watch<SeekData>(SEEK_STORE_KEY, (data: SeekData | null) => {
        if (!data || isUpdatingStorage) return

        const syncedData = syncWithType(data, defaultSeekData)
        set(syncedData)
    })

    async function toggleLongForm() {
        update((prev: SeekData) => ({
            ...prev,
            is_long_form: !prev.is_long_form
        }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<SeekData>(SEEK_STORE_KEY, newState)
        } catch (error) {
            console.error('Error toggling long form in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function reset() {
        set(defaultSeekData)
        isUpdatingStorage = true
        try {
            await storage.setItem<SeekData>(SEEK_STORE_KEY, defaultSeekData)
        } catch (error) {
            console.error('Error resetting seek data in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    return {
        reset,
        subscribe,
        updateSeek,
        toggleLongForm,
        updateMediaType
    }
}

export const seekStore = createSeekStore()
