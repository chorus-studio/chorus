import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

export type VolumeType = 'linear' | 'logarithmic'
export type VolumeState = {
    muted: boolean
    value: number
    type: VolumeType
}

const defaultVolumeState: VolumeState = {
    muted: false,
    value: 75,
    type: 'linear'
}

function createVolumeStore() {
    const store = writable(defaultVolumeState)
    const { subscribe, set, update } = store

    function dispatchVolumeEvent() {
        const volume = get(store)
        window.postMessage({ type: 'FROM_VOLUME_LISTENER', data: volume }, '*')
    }

    async function updateVolume(state: Partial<VolumeState>) {
        update((prev) => ({ ...prev, ...state }))
        await storage.setItem<VolumeState>('local:chorus_volume', get(store))
        dispatchVolumeEvent()
    }

    storage.getItem<VolumeState>('local:chorus_volume').then((volume) => {
        if (volume) set(volume)
    })

    storage.watch<VolumeState>('local:chorus_volume', (volume) => {
        if (volume) set(volume)
    })

    return {
        subscribe,
        updateVolume,
        dispatchVolumeEvent
    }
}

export const volumeStore = createVolumeStore()
