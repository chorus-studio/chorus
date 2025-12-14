import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

const VOLUME_STORE_KEY = 'local:chorus_volume'

export type VolumeType = 'linear' | 'logarithmic'
export type VolumeState = {
    muted: boolean
    value: number
    type: VolumeType
    default_volume: {
        linear: number
        logarithmic: number
    }
}

const defaultVolumeState: VolumeState = {
    muted: false,
    value: 75,
    type: 'linear',
    default_volume: {
        linear: 100,
        logarithmic: 100
    }
}

function createVolumeStore() {
    const store = writable(defaultVolumeState)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    function mute() {
        update((prev) => ({ ...prev, muted: true }))
        dispatchVolumeEvent()
    }

    function unMute() {
        if (!get(store).muted) return

        update((prev) => ({ ...prev, muted: false }))
        dispatchVolumeEvent()
    }

    function dispatchVolumeEvent() {
        const volume = get(store)
        window.postMessage({ type: 'FROM_VOLUME_LISTENER', data: volume }, '*')
    }

    async function updateDefaultVolume(state: Partial<VolumeState>) {
        update((prev) => ({ ...prev, default_volume: { ...prev.default_volume, ...state } }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<VolumeState>(VOLUME_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating default volume in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function updateVolume(state: Partial<VolumeState>, shouldDispatch = true) {
        update((prev) => ({ ...prev, ...state }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<VolumeState>(VOLUME_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating volume in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
        if (shouldDispatch) {
            dispatchVolumeEvent()
        }
    }

    async function resetVolume(shouldDispatch = true) {
        update((prev) => ({ ...prev, value: prev.default_volume[prev.type] }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<VolumeState>(VOLUME_STORE_KEY, newState)
        } catch (error) {
            console.error('Error resetting volume in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
        if (shouldDispatch) {
            dispatchVolumeEvent()
        }
    }

    storage.getItem<VolumeState>(VOLUME_STORE_KEY).then((volume) => {
        if (!volume) return

        // Sync the stored volume with the current type definition
        const syncedVolume = syncWithType(volume, defaultVolumeState)
        set(syncedVolume)

        // Update storage with synced volume
        isUpdatingStorage = true
        storage
            .setItem<VolumeState>(VOLUME_STORE_KEY, syncedVolume)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    storage.watch<VolumeState>(VOLUME_STORE_KEY, (volume) => {
        if (!volume || isUpdatingStorage) return

        const syncedVolume = syncWithType(volume, defaultVolumeState)
        set(syncedVolume)
    })

    // Listen for requests to reapply volume (e.g., after media element recreation)
    window.addEventListener('message', (event) => {
        if (event.source !== window) return
        if (event.data?.type === 'REQUEST_EFFECT_REAPPLY') {
            dispatchVolumeEvent()
        }
    })

    return {
        mute,
        unMute,
        subscribe,
        resetVolume,
        updateVolume,
        updateDefaultVolume,
        dispatchVolumeEvent
    }
}

export const volumeStore = createVolumeStore()
