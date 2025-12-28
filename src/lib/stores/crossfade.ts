import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'
import type { CrossfadeSettings } from '$lib/audio-effects/crossfade/types'
import { DEFAULT_CROSSFADE_SETTINGS } from '$lib/audio-effects/crossfade/types'

export const CROSSFADE_STORE_KEY = 'local:crossfade_settings'

function createCrossfadeStore() {
    const store = writable<CrossfadeSettings>(DEFAULT_CROSSFADE_SETTINGS)
    const { subscribe, set, update } = store

    // Flag to prevent infinite loops when updating storage
    let isUpdatingStorage = false

    async function updateSettings(settings: Partial<CrossfadeSettings>) {
        update((prev) => ({ ...prev, ...settings }))

        const currentState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<CrossfadeSettings>(CROSSFADE_STORE_KEY, currentState)
        } catch (error) {
            console.error('Error updating crossfade settings storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function reset() {
        set(DEFAULT_CROSSFADE_SETTINGS)
        isUpdatingStorage = true
        try {
            await storage.setItem<CrossfadeSettings>(
                CROSSFADE_STORE_KEY,
                DEFAULT_CROSSFADE_SETTINGS
            )
        } catch (error) {
            console.error('Error resetting crossfade settings in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    // Initialize from storage
    storage.getItem<CrossfadeSettings>(CROSSFADE_STORE_KEY).then((settings) => {
        if (!settings) return

        // Sync the stored settings with the current type definition
        const syncedSettings = syncWithType(settings, DEFAULT_CROSSFADE_SETTINGS)
        set(syncedSettings)

        // Update storage with synced settings
        isUpdatingStorage = true
        storage
            .setItem<CrossfadeSettings>(CROSSFADE_STORE_KEY, syncedSettings)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    // Watch for external changes
    storage.watch<CrossfadeSettings>(CROSSFADE_STORE_KEY, (settings) => {
        if (!settings || isUpdatingStorage) return

        const syncedSettings = syncWithType(settings, DEFAULT_CROSSFADE_SETTINGS)
        set(syncedSettings)
    })

    return {
        subscribe,
        updateSettings,
        reset
    }
}

export const crossfadeStore = createCrossfadeStore()
